-- Any group member can start a new game (not only owner/manager)

DROP POLICY IF EXISTS "games_insert" ON public.games;
CREATE POLICY "games_insert"
  ON public.games FOR INSERT
  WITH CHECK (public.is_group_member(group_id));
