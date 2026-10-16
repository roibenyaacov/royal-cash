-- ============================================
-- reopen_game_atomic v2 — also undo a finalize
--
-- 026 refused to reopen once a game was finalized, because finalizing is the
-- write that touches group history: it stamps games.finalized_at, inserts a
-- group_win_records row per winner, and rolls each player's running totals
-- into player_group_stats. A miscount discovered after "share & close" was
-- therefore permanent. This makes that reversible.
--
-- Reversing the first two is a delete. The third is not: finalize_game_with_stats
-- updates player_group_stats incrementally —
--     games_played  = games_played + 1
--     total_balance = total_balance + final_balance
--     biggest_win   = GREATEST(biggest_win, final_balance)
--     biggest_loss  = LEAST(biggest_loss, final_balance)
-- and GREATEST/LEAST have no inverse. If the reopened game held a player's
-- biggest win, subtracting cannot recover the previous best; only the
-- remaining games know it. So the stats are recomputed from scratch for every
-- player who appeared in this game, over whatever finalized games are left.
-- That is also self-healing: any drift from an earlier partial write is
-- corrected on the way through.
--
-- The incremental finalize still composes correctly afterwards: reopen leaves
-- the totals right for N-1 games, and re-finalizing adds the game back as +1.
--
-- One transaction:
--   1. Lock the game row (FOR UPDATE) so this can't race a close or finalize.
--   2. Capture the players whose stats this game contributed to, before the
--      results rows that name them are deleted.
--   3. Delete group_win_records, settlements and game_results for the game.
--      Members hold no DELETE policy on any of those, which is why this runs
--      SECURITY DEFINER.
--   4. Flip the game back to active and clear closed_at + finalized_at.
--   5. Recompute player_group_stats for the captured players.
--
-- cash_outs are kept on purpose: the close screen pre-fills from them, so the
-- user lands back on the amounts they entered instead of a blank form.
--
-- Idempotent: reopening an active game is a no-op.
-- ============================================
CREATE OR REPLACE FUNCTION public.reopen_game_atomic(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  game_row RECORD;
  v_group_id UUID;
  v_was_finalized BOOLEAN;
  v_player_ids UUID[];
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

  IF game_row.status = 'active' THEN
    RETURN jsonb_build_object('success', true, 'already_active', true);
  END IF;

  IF game_row.status <> 'closed' THEN
    RETURN jsonb_build_object('error', 'game_not_closed');
  END IF;

  v_group_id      := game_row.group_id;
  v_was_finalized := game_row.finalized_at IS NOT NULL;

  -- Capture before the delete: once game_results is gone there is no record
  -- of which players this game's stats were folded into.
  SELECT array_agg(DISTINCT player_id)
    INTO v_player_ids
    FROM public.game_results
    WHERE game_id = p_game_id;

  DELETE FROM public.group_win_records WHERE game_id = p_game_id;
  DELETE FROM public.settlements       WHERE game_id = p_game_id;
  DELETE FROM public.game_results      WHERE game_id = p_game_id;

  UPDATE public.games
    SET status       = 'active',
        closed_at    = NULL,
        finalized_at = NULL
    WHERE id = p_game_id;

  -- Only a finalized game ever reached player_group_stats.
  IF v_was_finalized AND v_player_ids IS NOT NULL THEN
    UPDATE public.player_group_stats s
      SET games_played  = agg.games_played,
          total_balance = agg.total_balance,
          biggest_win   = agg.biggest_win,
          biggest_loss  = agg.biggest_loss,
          updated_at    = now()
      FROM (
        SELECT
          a.player_id,
          COALESCE(st.games_played,  0) AS games_played,
          COALESCE(st.total_balance, 0) AS total_balance,
          COALESCE(st.biggest_win,   0) AS biggest_win,
          COALESCE(st.biggest_loss,  0) AS biggest_loss
        FROM unnest(v_player_ids) AS a(player_id)
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)                                                  AS games_played,
            SUM(gr.final_balance)                                     AS total_balance,
            MAX(gr.final_balance) FILTER (WHERE gr.final_balance > 0) AS biggest_win,
            MIN(gr.final_balance) FILTER (WHERE gr.final_balance < 0) AS biggest_loss
          FROM public.game_results gr
          JOIN public.games g ON g.id = gr.game_id
          WHERE gr.player_id   = a.player_id
            AND g.group_id     = v_group_id
            AND g.finalized_at IS NOT NULL
        ) st ON TRUE
      ) agg
      WHERE s.player_id = agg.player_id
        AND s.group_id  = v_group_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'was_finalized', v_was_finalized
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_game_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_game_atomic(UUID) TO authenticated;
