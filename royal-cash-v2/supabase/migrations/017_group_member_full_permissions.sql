-- Open group game management to all members (not only owner/manager)

-- Players roster
DROP POLICY IF EXISTS "players_insert" ON public.players;
CREATE POLICY "players_insert"
  ON public.players FOR INSERT
  WITH CHECK (public.is_group_member(group_id));

DROP POLICY IF EXISTS "players_update" ON public.players;
CREATE POLICY "players_update"
  ON public.players FOR UPDATE
  USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS "players_delete" ON public.players;
CREATE POLICY "players_delete"
  ON public.players FOR DELETE
  USING (public.is_group_member(group_id));

-- Games
DROP POLICY IF EXISTS "games_insert" ON public.games;
CREATE POLICY "games_insert"
  ON public.games FOR INSERT
  WITH CHECK (public.is_group_member(group_id));

DROP POLICY IF EXISTS "games_update" ON public.games;
CREATE POLICY "games_update"
  ON public.games FOR UPDATE
  USING (public.is_group_member(group_id));

-- Game roster
DROP POLICY IF EXISTS "game_players_insert" ON public.game_players;
CREATE POLICY "game_players_insert"
  ON public.game_players FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "game_players_delete" ON public.game_players;
CREATE POLICY "game_players_delete"
  ON public.game_players FOR DELETE
  USING (public.is_group_member(public.game_group_id(game_id)));

-- Buy-ins
DROP POLICY IF EXISTS "buy_ins_insert" ON public.buy_ins;
CREATE POLICY "buy_ins_insert"
  ON public.buy_ins FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "buy_ins_delete" ON public.buy_ins;
CREATE POLICY "buy_ins_delete"
  ON public.buy_ins FOR DELETE
  USING (public.is_group_member(public.game_group_id(game_id)));

-- Expenses
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE
  USING (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "expense_participants_insert" ON public.expense_participants;
CREATE POLICY "expense_participants_insert"
  ON public.expense_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND public.is_group_member(public.game_group_id(e.game_id))
    )
  );

-- Activity log
DROP POLICY IF EXISTS "game_events_insert" ON public.game_events;
CREATE POLICY "game_events_insert"
  ON public.game_events FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

-- Cash-outs (close game)
DROP POLICY IF EXISTS "cash_outs_insert" ON public.cash_outs;
CREATE POLICY "cash_outs_insert"
  ON public.cash_outs FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "cash_outs_update" ON public.cash_outs;
CREATE POLICY "cash_outs_update"
  ON public.cash_outs FOR UPDATE
  USING (public.is_group_member(public.game_group_id(game_id)));

-- Close / finalize results
DROP POLICY IF EXISTS "game_results_insert" ON public.game_results;
CREATE POLICY "game_results_insert"
  ON public.game_results FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "settlements_insert" ON public.settlements;
CREATE POLICY "settlements_insert"
  ON public.settlements FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

-- Invites & links
DROP POLICY IF EXISTS "player_claim_invites_select" ON public.player_claim_invites;
CREATE POLICY "player_claim_invites_select"
  ON public.player_claim_invites FOR SELECT
  USING (public.is_group_member(public.player_group_id(player_id)));

DROP POLICY IF EXISTS "player_claim_invites_insert" ON public.player_claim_invites;
CREATE POLICY "player_claim_invites_insert"
  ON public.player_claim_invites FOR INSERT
  WITH CHECK (public.is_group_member(public.player_group_id(player_id)));

DROP POLICY IF EXISTS "player_claim_invites_update" ON public.player_claim_invites;
CREATE POLICY "player_claim_invites_update"
  ON public.player_claim_invites FOR UPDATE
  USING (public.is_group_member(public.player_group_id(player_id)));

DROP POLICY IF EXISTS "group_invites_select" ON public.group_invites;
CREATE POLICY "group_invites_select"
  ON public.group_invites FOR SELECT
  USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS "group_invites_insert" ON public.group_invites;
CREATE POLICY "group_invites_insert"
  ON public.group_invites FOR INSERT
  WITH CHECK (public.is_group_member(group_id));

DROP POLICY IF EXISTS "group_invites_update" ON public.group_invites;
CREATE POLICY "group_invites_update"
  ON public.group_invites FOR UPDATE
  USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS "game_access_links_select" ON public.game_access_links;
CREATE POLICY "game_access_links_select"
  ON public.game_access_links FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "game_access_links_insert" ON public.game_access_links;
CREATE POLICY "game_access_links_insert"
  ON public.game_access_links FOR INSERT
  WITH CHECK (public.is_group_member(public.game_group_id(game_id)));

DROP POLICY IF EXISTS "game_access_links_update" ON public.game_access_links;
CREATE POLICY "game_access_links_update"
  ON public.game_access_links FOR UPDATE
  USING (public.is_group_member(public.game_group_id(game_id)));
