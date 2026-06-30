-- Allow any group member to UPDATE game_players rows.
--
-- This powers the per-game "who is responsible for the money" setting: managers
-- are stored in game_players.is_manager, and changing them (at creation or
-- mid-game) requires UPDATE. The base schema (002) only had select/insert/delete
-- policies, and 017 opened insert/delete to all members — this adds the matching
-- UPDATE permission so the open, member-managed model stays consistent.

DROP POLICY IF EXISTS "game_players_update" ON public.game_players;
CREATE POLICY "game_players_update"
  ON public.game_players FOR UPDATE
  USING (public.is_group_member(public.game_group_id(game_id)))
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));
