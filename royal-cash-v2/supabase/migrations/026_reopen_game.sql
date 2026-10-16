-- ============================================
-- reopen_game_atomic — undo a close so the amounts can be corrected
--
-- Closing used to be one-way: close_game_atomic flips the game to 'closed'
-- and writes game_results + settlements, and both the table and the close
-- screen bounce a closed game to the results page. This is the inverse, so a
-- mistyped cash-out can be fixed instead of living in the group history.
--
-- One transaction:
--   1. Lock the game row (FOR UPDATE) so this can't race a concurrent close.
--   2. Refuse once the game is finalized — finalizing wrote player stats and
--      win records, which this function does not reverse.
--   3. Delete settlements + game_results (members have no DELETE policy on
--      those tables, which is why this runs as SECURITY DEFINER).
--   4. Flip the game back to 'active' and clear closed_at.
--
-- cash_outs are kept on purpose: the close screen pre-fills from them, so the
-- user lands back on the amounts they entered instead of a blank form.
--
-- Idempotent: safe to re-run, and reopening an active game is a no-op.
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

  IF game_row.finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'game_finalized');
  END IF;

  IF game_row.status = 'active' THEN
    RETURN jsonb_build_object('success', true, 'already_active', true);
  END IF;

  IF game_row.status <> 'closed' THEN
    RETURN jsonb_build_object('error', 'game_not_closed');
  END IF;

  DELETE FROM public.settlements WHERE game_id = p_game_id;
  DELETE FROM public.game_results WHERE game_id = p_game_id;

  UPDATE public.games
    SET status = 'active',
        closed_at = NULL
    WHERE id = p_game_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_game_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_game_atomic(UUID) TO authenticated;
