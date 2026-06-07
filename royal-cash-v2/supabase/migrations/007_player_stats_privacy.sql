-- ============================================
-- Player stats & game history privacy
-- Only the linked account owner can read personal stats/history rows.
-- Group game results/settlements pages use SECURITY DEFINER RPCs.
-- ============================================

CREATE OR REPLACE FUNCTION public.is_linked_player(check_player_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE id = check_player_id
      AND linked_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "player_group_stats_select" ON public.player_group_stats;
CREATE POLICY "player_group_stats_select_own"
  ON public.player_group_stats FOR SELECT
  USING (public.is_linked_player(player_id));

DROP POLICY IF EXISTS "game_results_select" ON public.game_results;
CREATE POLICY "game_results_select_own"
  ON public.game_results FOR SELECT
  USING (
    public.is_group_member(public.game_group_id(game_id))
    AND public.is_linked_player(player_id)
  );

CREATE OR REPLACE FUNCTION public.get_game_results_for_member(p_game_id UUID)
RETURNS SETOF public.game_results
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT gr.*
  FROM public.game_results gr
  WHERE gr.game_id = p_game_id
    AND public.is_group_member(public.game_group_id(p_game_id));
$$;

CREATE OR REPLACE FUNCTION public.get_game_settlements_for_member(p_game_id UUID)
RETURNS SETOF public.settlements
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT s.*
  FROM public.settlements s
  WHERE s.game_id = p_game_id
    AND public.is_group_member(public.game_group_id(p_game_id));
$$;

GRANT EXECUTE ON FUNCTION public.get_game_results_for_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_settlements_for_member(UUID) TO authenticated;
