-- Only the group owner may remove players from the roster (soft-delete via UPDATE).

DROP POLICY IF EXISTS "players_update" ON public.players;
CREATE POLICY "players_update"
  ON public.players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = players.group_id
        AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "players_delete" ON public.players;
CREATE POLICY "players_delete"
  ON public.players FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = players.group_id
        AND g.owner_id = auth.uid()
    )
  );
