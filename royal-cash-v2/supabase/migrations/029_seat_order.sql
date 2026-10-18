-- ============================================
-- Seat order — arrange the table to match how people actually sit.
--
-- Seats were rendered in display_name order, which has nothing to do with the
-- room. This stores an explicit position per player per game so the on-screen
-- table mirrors the real one, shared across everyone viewing the game rather
-- than kept per-device.
--
-- NULL means "not arranged yet". Those seats sort after the arranged ones and
-- fall back to the old alphabetical order among themselves, so a game that
-- nobody has rearranged looks exactly as it did before, and a player added
-- mid-game lands at the end instead of jumping into the middle.
--
-- Idempotent: safe to re-run.
-- ============================================

ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS seat_order INTEGER;

COMMENT ON COLUMN public.game_players.seat_order IS
  'Position around the table, 0-based. NULL = never arranged; sorts last.';

CREATE INDEX IF NOT EXISTS idx_game_players_seat_order
  ON public.game_players(game_id, seat_order);

-- ============================================
-- set_seat_order — write a whole arrangement in one statement.
--
-- Takes the player ids in their new order and stamps each row with its index.
-- Done as a single UPDATE ... FROM so a reorder cannot land half-applied and
-- leave two players claiming one seat.
--
-- Players in the game but absent from the array keep whatever they had; a
-- player id that is not in this game simply matches nothing.
--
-- Returns the number of rows positioned, so the caller can tell a no-op from
-- a silent authorization failure.
-- ============================================
CREATE OR REPLACE FUNCTION public.set_seat_order(
  p_game_id    UUID,
  p_player_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  v_group_id UUID;
  v_updated INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT group_id INTO v_group_id FROM public.games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;

  IF NOT public.is_group_member(v_group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  UPDATE public.game_players gp
    SET seat_order = ordered.position
    FROM (
      SELECT player_id, ordinality - 1 AS position
      FROM unnest(p_player_ids) WITH ORDINALITY AS t(player_id, ordinality)
    ) AS ordered
    WHERE gp.game_id   = p_game_id
      AND gp.player_id = ordered.player_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.set_seat_order(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_seat_order(UUID, UUID[]) TO authenticated;
