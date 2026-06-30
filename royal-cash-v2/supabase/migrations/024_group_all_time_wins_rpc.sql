-- Podium: group members can read all players' top game_net wins (not only linked self).

CREATE OR REPLACE FUNCTION public.get_group_all_time_wins_for_member(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  player_id UUID,
  game_id UUID,
  game_net INTEGER,
  created_at TIMESTAMPTZ,
  game_name TEXT,
  game_date DATE,
  finalized_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    gr.id,
    gr.player_id,
    gr.game_id,
    gr.game_net,
    gr.created_at,
    g.name,
    g.date,
    g.finalized_at
  FROM public.game_results gr
  JOIN public.games g ON g.id = gr.game_id
  WHERE g.group_id = p_group_id
    AND g.finalized_at IS NOT NULL
    AND gr.game_net > 0
    AND public.is_group_member(p_group_id)
  ORDER BY gr.game_net DESC, g.finalized_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_group_all_time_wins_for_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_all_time_wins_for_member(UUID) TO authenticated;
