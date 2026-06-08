-- Allow any group member to manage buy-ins, expenses, and activity on active games

CREATE OR REPLACE FUNCTION public.can_manage_active_game(check_game_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = check_game_id
      AND g.status = 'active'
      AND public.is_group_member(g.group_id)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "game_players_insert" ON public.game_players;
CREATE POLICY "game_players_insert"
  ON public.game_players FOR INSERT
  WITH CHECK (
    public.is_group_admin(public.game_group_id(game_id))
    OR public.can_manage_active_game(game_id)
  );

DROP POLICY IF EXISTS "buy_ins_insert" ON public.buy_ins;
CREATE POLICY "buy_ins_insert"
  ON public.buy_ins FOR INSERT
  WITH CHECK (
    public.is_group_admin(public.game_group_id(game_id))
    OR public.can_manage_active_game(game_id)
  );

DROP POLICY IF EXISTS "buy_ins_delete" ON public.buy_ins;
CREATE POLICY "buy_ins_delete"
  ON public.buy_ins FOR DELETE
  USING (
    public.is_group_admin(public.game_group_id(game_id))
    OR public.can_manage_active_game(game_id)
  );

DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (
    public.is_group_admin(public.game_group_id(game_id))
    OR public.can_manage_active_game(game_id)
  );

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE
  USING (
    public.is_group_admin(public.game_group_id(game_id))
    OR public.can_manage_active_game(game_id)
  );

DROP POLICY IF EXISTS "game_events_insert" ON public.game_events;
CREATE POLICY "game_events_insert"
  ON public.game_events FOR INSERT
  WITH CHECK (
    public.is_group_admin(public.game_group_id(game_id))
    OR public.can_manage_active_game(game_id)
  );

-- expense_participants insert goes through expense parent; add explicit policy if missing
DROP POLICY IF EXISTS "expense_participants_insert" ON public.expense_participants;
CREATE POLICY "expense_participants_insert"
  ON public.expense_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND (
          public.is_group_admin(public.game_group_id(e.game_id))
          OR public.can_manage_active_game(e.game_id)
        )
    )
  );
