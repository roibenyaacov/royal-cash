-- ============================================
-- Editing an expense after the fact.
--
-- Until now an expense was write-once: the only way to correct a wrong
-- amount, a wrong payer or a wrong split was to leave it wrong, because
-- `expenses` had INSERT/DELETE policies but no UPDATE, and
-- `expense_participants` had no DELETE. A mistyped "pizza 200" therefore
-- poisoned every balance and settlement for that game permanently.
--
-- Two things make this safe rather than a free-for-all:
--
--   1. The amount and its participant split have to stay in agreement.
--      An expense whose participants do not sum to its amount silently
--      breaks `calcAllPlayerBalances`, so replacing the split and
--      replacing the amount must happen together or not at all. Both RPCs
--      below do all their writes in one function body, which is one
--      transaction: a failure anywhere rolls the whole edit back and the
--      old, consistent expense survives.
--
--   2. The same guards the insert path already applies are re-applied
--      here server-side (game is active, caller is a group member, every
--      player is in this game, amounts sum correctly), so an edit cannot
--      reach further than an add could.
--
-- The activity log gets its own entry for each edit and each removal, so
-- a corrected expense leaves a trail instead of quietly changing history.
--
-- Idempotent: safe to re-run.
-- ============================================

-- ============================================
-- game_events.event_type — allow the two new log entries.
--
-- The column is TEXT with a CHECK, not an enum, so the constraint is
-- dropped and recreated with the wider set. Existing rows all hold one of
-- the original three values, so the new constraint validates immediately.
--
-- The old constraint is found by what it constrains rather than by name:
-- a `DROP CONSTRAINT IF EXISTS <guessed name>` that guessed wrong would
-- silently leave the narrow check in place, and every expense edit would
-- then fail on the log insert instead.
-- ============================================
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'game_events'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) LIKE '%event_type%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.game_events DROP CONSTRAINT %I', c.conname
    );
  END LOOP;
END;
$$;

ALTER TABLE public.game_events
  ADD CONSTRAINT game_events_event_type_check CHECK (
    event_type IN (
      'buy_in_added',
      'buy_in_removed',
      'expense_added',
      'expense_updated',
      'expense_removed'
    )
  );

-- ============================================
-- update_expense_atomic — replace an expense and its split in one shot.
--
-- p_player_ids and p_amounts are parallel arrays: p_amounts[i] is what
-- p_player_ids[i] owes. They are passed apart rather than as a composite
-- type so the PostgREST call stays two plain JSON arrays.
--
-- Returns the stored expense, its participants and the log event, so the
-- caller can reconcile its optimistic state without a second round trip.
-- ============================================
CREATE OR REPLACE FUNCTION public.update_expense_atomic(
  p_expense_id          UUID,
  p_paid_by_player_id   UUID,
  p_amount              INTEGER,
  p_description         TEXT,
  p_split_type          TEXT,
  p_player_ids          UUID[],
  p_amounts             INTEGER[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid               UUID := auth.uid();
  v_game_id         UUID;
  v_group_id        UUID;
  v_status          TEXT;
  v_count           INTEGER;
  v_sum             INTEGER;
  v_missing         INTEGER;
  v_expense         public.expenses;
  v_event           public.game_events;
  v_participants    JSONB;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT e.game_id INTO v_game_id
    FROM public.expenses e
    WHERE e.id = p_expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'expense_not_found');
  END IF;

  SELECT g.group_id, g.status INTO v_group_id, v_status
    FROM public.games g
    WHERE g.id = v_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;

  IF NOT public.is_group_member(v_group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  -- A closed or finalized game has results and settlements derived from
  -- these numbers. Reopening it (reopen_game_atomic) is the supported way
  -- back to editing; changing an expense underneath a closed game would
  -- leave the stored results disagreeing with their own inputs.
  IF v_status <> 'active' THEN
    RETURN jsonb_build_object('error', 'game_not_active');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_amount');
  END IF;

  IF p_split_type IS NULL
     OR p_split_type NOT IN ('equal_split', 'custom_split', 'personal') THEN
    RETURN jsonb_build_object('error', 'invalid_split_type');
  END IF;

  IF p_player_ids IS NULL
     OR p_amounts IS NULL
     OR array_length(p_player_ids, 1) IS NULL
     OR array_length(p_player_ids, 1) <> array_length(p_amounts, 1) THEN
    RETURN jsonb_build_object('error', 'invalid_participants');
  END IF;

  -- Duplicate participants would double-charge one player while still
  -- summing to the total, so the sum check alone would not catch it.
  SELECT COUNT(DISTINCT pid) INTO v_count FROM unnest(p_player_ids) AS pid;
  IF v_count <> array_length(p_player_ids, 1) THEN
    RETURN jsonb_build_object('error', 'duplicate_participant');
  END IF;

  SELECT COALESCE(SUM(amt), 0), COUNT(*) FILTER (WHERE amt < 0)
    INTO v_sum, v_count
    FROM unnest(p_amounts) AS amt;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('error', 'invalid_participant_amount');
  END IF;
  IF v_sum <> p_amount THEN
    RETURN jsonb_build_object('error', 'split_sum_mismatch');
  END IF;

  -- The payer and every participant must be sitting at this game.
  IF NOT EXISTS (
    SELECT 1 FROM public.game_players gp
    WHERE gp.game_id = v_game_id AND gp.player_id = p_paid_by_player_id
  ) THEN
    RETURN jsonb_build_object('error', 'payer_not_in_game');
  END IF;

  SELECT COUNT(*) INTO v_missing
    FROM unnest(p_player_ids) AS pid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.game_players gp
      WHERE gp.game_id = v_game_id AND gp.player_id = pid
    );
  IF v_missing > 0 THEN
    RETURN jsonb_build_object('error', 'participant_not_in_game');
  END IF;

  -- Replace the split wholesale. Deleting first keeps this simple and
  -- correct for every shape of change (a participant dropped, added, or
  -- just re-weighted) without having to diff the old rows.
  DELETE FROM public.expense_participants WHERE expense_id = p_expense_id;

  INSERT INTO public.expense_participants (expense_id, player_id, amount_owed)
  SELECT p_expense_id, t.player_id, t.amount
    FROM unnest(p_player_ids, p_amounts) AS t(player_id, amount);

  UPDATE public.expenses
     SET paid_by_player_id = p_paid_by_player_id,
         amount            = p_amount,
         description       = NULLIF(btrim(COALESCE(p_description, '')), ''),
         split_type        = p_split_type
   WHERE id = p_expense_id
  RETURNING * INTO v_expense;

  INSERT INTO public.game_events
    (game_id, event_type, player_id, amount, description, created_by)
  VALUES
    (v_game_id, 'expense_updated', p_paid_by_player_id, p_amount,
     v_expense.description, uid)
  RETURNING * INTO v_event;

  SELECT COALESCE(jsonb_agg(to_jsonb(ep)), '[]'::jsonb) INTO v_participants
    FROM public.expense_participants ep
    WHERE ep.expense_id = p_expense_id;

  RETURN jsonb_build_object(
    'success',      true,
    'expense',      to_jsonb(v_expense),
    'participants', v_participants,
    'event',        to_jsonb(v_event)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_expense_atomic(
  UUID, UUID, INTEGER, TEXT, TEXT, UUID[], INTEGER[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_expense_atomic(
  UUID, UUID, INTEGER, TEXT, TEXT, UUID[], INTEGER[]
) TO authenticated;

-- ============================================
-- delete_expense_atomic — drop an expense and log it together.
--
-- `expense_participants` goes with it via ON DELETE CASCADE. The log entry
-- is written in the same transaction so the ledger never shows an expense
-- vanishing without a trace.
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_expense_atomic(
  p_expense_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid        UUID := auth.uid();
  v_game_id  UUID;
  v_group_id UUID;
  v_status   TEXT;
  v_expense  public.expenses;
  v_event    public.game_events;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT e.game_id INTO v_game_id
    FROM public.expenses e
    WHERE e.id = p_expense_id;
  IF NOT FOUND THEN
    -- Already gone: a second tap, or another manager got there first.
    -- Report success so the caller's optimistic removal stands.
    RETURN jsonb_build_object('success', true, 'already_deleted', true);
  END IF;

  SELECT g.group_id, g.status INTO v_group_id, v_status
    FROM public.games g
    WHERE g.id = v_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;

  IF NOT public.is_group_member(v_group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  IF v_status <> 'active' THEN
    RETURN jsonb_build_object('error', 'game_not_active');
  END IF;

  DELETE FROM public.expenses WHERE id = p_expense_id
  RETURNING * INTO v_expense;

  INSERT INTO public.game_events
    (game_id, event_type, player_id, amount, description, created_by)
  VALUES
    (v_game_id, 'expense_removed', v_expense.paid_by_player_id,
     v_expense.amount, v_expense.description, uid)
  RETURNING * INTO v_event;

  RETURN jsonb_build_object(
    'success', true,
    'event',   to_jsonb(v_event)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expense_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_expense_atomic(UUID) TO authenticated;
