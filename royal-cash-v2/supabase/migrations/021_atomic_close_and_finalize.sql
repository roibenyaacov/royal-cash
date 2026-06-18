-- ============================================
-- H2/H3 — atomic close_game + finalize-with-stats
--
-- Both functions are SECURITY DEFINER so they can write to RLS-protected
-- tables in a single transaction. Membership is checked explicitly inside
-- each function via public.is_group_member().
--
-- Idempotent: safe to re-run.
-- ============================================

-- ============================================
-- close_game_atomic
--
-- One transaction:
--   1. Lock the game row (FOR UPDATE) so concurrent close attempts serialize.
--   2. Upsert cash-outs.
--   3. Replace game_results + settlements (DELETE+INSERT) so retries after
--      a partial failure converge on the correct state.
--   4. Mark the game closed.
--
-- If the game is already closed AND results exist, the call returns
-- success={already_closed:true} so a network retry is safe.
-- ============================================
CREATE OR REPLACE FUNCTION public.close_game_atomic(
  p_game_id      UUID,
  p_cash_outs    JSONB,   -- [{ player_id, amount }]
  p_results      JSONB,   -- [{ player_id, total_buy_in, cash_out, game_net, expense_credit, expense_debt, final_balance }]
  p_settlements  JSONB    -- [{ from_player_id, to_player_id, amount }]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  game_row RECORD;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO game_row FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;

  IF NOT public.is_group_member(game_row.group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  -- Idempotent retry after a successful close.
  IF game_row.status = 'closed' THEN
    IF EXISTS (SELECT 1 FROM public.game_results WHERE game_id = p_game_id) THEN
      RETURN jsonb_build_object('success', true, 'already_closed', true);
    END IF;
    -- Closed but no results — shouldn't normally happen; allow re-run.
  ELSIF game_row.status <> 'active' THEN
    RETURN jsonb_build_object('error', 'game_not_active');
  END IF;

  -- Upsert cash-outs
  INSERT INTO public.cash_outs (game_id, player_id, amount, created_by)
  SELECT
    p_game_id,
    (entry->>'player_id')::UUID,
    (entry->>'amount')::INTEGER,
    uid
  FROM jsonb_array_elements(p_cash_outs) AS entry
  ON CONFLICT (game_id, player_id) DO UPDATE
    SET amount = EXCLUDED.amount,
        created_by = EXCLUDED.created_by,
        updated_at = now();

  -- Replace results
  DELETE FROM public.game_results WHERE game_id = p_game_id;
  INSERT INTO public.game_results (
    game_id, player_id,
    total_buy_in, cash_out, game_net,
    expense_credit, expense_debt, final_balance
  )
  SELECT
    p_game_id,
    (entry->>'player_id')::UUID,
    (entry->>'total_buy_in')::INTEGER,
    (entry->>'cash_out')::INTEGER,
    (entry->>'game_net')::INTEGER,
    (entry->>'expense_credit')::INTEGER,
    (entry->>'expense_debt')::INTEGER,
    (entry->>'final_balance')::INTEGER
  FROM jsonb_array_elements(p_results) AS entry;

  -- Replace settlements (no natural key — wipe + insert is safe inside this tx)
  DELETE FROM public.settlements WHERE game_id = p_game_id;
  INSERT INTO public.settlements (game_id, from_player_id, to_player_id, amount)
  SELECT
    p_game_id,
    (entry->>'from_player_id')::UUID,
    (entry->>'to_player_id')::UUID,
    (entry->>'amount')::INTEGER
  FROM jsonb_array_elements(p_settlements) AS entry;

  -- Mark closed (no-op if it was already closed in the idempotent branch)
  UPDATE public.games
    SET status = 'closed',
        closed_at = COALESCE(closed_at, now())
    WHERE id = p_game_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.close_game_atomic(UUID, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_game_atomic(UUID, JSONB, JSONB, JSONB) TO authenticated;

-- ============================================
-- finalize_game_with_stats
--
-- One transaction:
--   1. Lock the game row.
--   2. Verify it's closed and not yet finalized.
--   3. Mark finalized_at.
--   4. Upsert player_group_stats from game_results in a single statement.
--   5. Insert any group_win_records that beat the existing record.
--
-- Idempotent: returns {already_finalized: true} on retry.
-- ============================================
CREATE OR REPLACE FUNCTION public.finalize_game_with_stats(
  p_game_id  UUID,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  game_row RECORD;
  current_record INTEGER;
  win_row RECORD;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF NOT public.is_group_member(p_group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  SELECT * INTO game_row FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;
  IF game_row.group_id <> p_group_id THEN
    RETURN jsonb_build_object('error', 'invalid_group');
  END IF;
  IF game_row.status <> 'closed' THEN
    RETURN jsonb_build_object('error', 'game_not_closed');
  END IF;
  IF game_row.finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_finalized', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.game_results WHERE game_id = p_game_id) THEN
    RETURN jsonb_build_object('error', 'no_results');
  END IF;

  UPDATE public.games
    SET finalized_at = now()
    WHERE id = p_game_id;

  -- Batched stats upsert. The CTE computes the new running totals per
  -- player by joining game_results to existing player_group_stats.
  WITH new_stats AS (
    SELECT
      gr.player_id,
      p_group_id AS group_id,
      COALESCE(s.games_played, 0) + 1 AS games_played,
      COALESCE(s.total_balance, 0) + gr.final_balance AS total_balance,
      GREATEST(
        COALESCE(s.biggest_win, 0),
        CASE WHEN gr.final_balance > 0 THEN gr.final_balance ELSE 0 END
      ) AS biggest_win,
      LEAST(
        COALESCE(s.biggest_loss, 0),
        CASE WHEN gr.final_balance < 0 THEN gr.final_balance ELSE 0 END
      ) AS biggest_loss
    FROM public.game_results gr
    LEFT JOIN public.player_group_stats s
      ON s.player_id = gr.player_id
     AND s.group_id  = p_group_id
    WHERE gr.game_id = p_game_id
  )
  INSERT INTO public.player_group_stats (
    player_id, group_id, games_played, total_balance,
    biggest_win, biggest_loss
  )
  SELECT player_id, group_id, games_played, total_balance,
         biggest_win, biggest_loss
  FROM new_stats
  ON CONFLICT (player_id, group_id) DO UPDATE SET
    games_played  = EXCLUDED.games_played,
    total_balance = EXCLUDED.total_balance,
    biggest_win   = EXCLUDED.biggest_win,
    biggest_loss  = EXCLUDED.biggest_loss,
    updated_at    = now();

  -- Insert win records for game_nets that beat the existing best.
  SELECT COALESCE(MAX(amount), 0) INTO current_record
    FROM public.group_win_records
    WHERE group_id = p_group_id;

  FOR win_row IN
    SELECT player_id, game_net
      FROM public.game_results
      WHERE game_id = p_game_id AND game_net > 0
      ORDER BY game_net DESC
  LOOP
    IF win_row.game_net <= current_record THEN
      CONTINUE;
    END IF;
    INSERT INTO public.group_win_records (group_id, player_id, game_id, amount)
      VALUES (p_group_id, win_row.player_id, p_game_id, win_row.game_net);
    current_record := win_row.game_net;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_game_with_stats(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_game_with_stats(UUID, UUID) TO authenticated;
