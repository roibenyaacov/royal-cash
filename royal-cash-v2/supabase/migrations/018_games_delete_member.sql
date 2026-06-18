-- Allow group members to delete games (e.g. discard an active table)

DROP POLICY IF EXISTS "games_delete" ON public.games;
CREATE POLICY "games_delete"
  ON public.games FOR DELETE
  USING (public.is_group_member(group_id));
