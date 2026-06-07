-- ============================================
-- Royal Cash v2 - Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: check group membership
-- Used by all policies to avoid recursive subqueries
-- ============================================
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is owner/manager of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get the group_id for a game
CREATE OR REPLACE FUNCTION public.game_group_id(check_game_id UUID)
RETURNS UUID AS $$
  SELECT group_id FROM public.games WHERE id = check_game_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- GROUPS
-- ============================================
CREATE POLICY "groups_select_member"
  ON public.groups FOR SELECT
  USING (public.is_group_member(id));

CREATE POLICY "groups_insert_auth"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "groups_update_owner"
  ON public.groups FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "groups_delete_owner"
  ON public.groups FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- GROUP MEMBERS
-- ============================================
CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "group_members_insert"
  ON public.group_members FOR INSERT
  WITH CHECK (
    public.is_group_admin(group_id)
    OR (user_id = auth.uid())
  );

CREATE POLICY "group_members_delete"
  ON public.group_members FOR DELETE
  USING (
    public.is_group_admin(group_id)
    OR user_id = auth.uid()
  );

-- ============================================
-- PLAYERS
-- ============================================
CREATE POLICY "players_select"
  ON public.players FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "players_insert"
  ON public.players FOR INSERT
  WITH CHECK (public.is_group_admin(group_id));

CREATE POLICY "players_update"
  ON public.players FOR UPDATE
  USING (public.is_group_admin(group_id));

CREATE POLICY "players_delete"
  ON public.players FOR DELETE
  USING (public.is_group_admin(group_id));

-- ============================================
-- GAMES
-- ============================================
CREATE POLICY "games_select"
  ON public.games FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "games_insert"
  ON public.games FOR INSERT
  WITH CHECK (public.is_group_admin(group_id));

CREATE POLICY "games_update"
  ON public.games FOR UPDATE
  USING (public.is_group_admin(group_id));

-- ============================================
-- GAME PLAYERS
-- ============================================
CREATE POLICY "game_players_select"
  ON public.game_players FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

CREATE POLICY "game_players_insert"
  ON public.game_players FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));

CREATE POLICY "game_players_delete"
  ON public.game_players FOR DELETE
  USING (public.is_group_admin(public.game_group_id(game_id)));

-- ============================================
-- BUY-INS
-- ============================================
CREATE POLICY "buy_ins_select"
  ON public.buy_ins FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

CREATE POLICY "buy_ins_insert"
  ON public.buy_ins FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));

CREATE POLICY "buy_ins_delete"
  ON public.buy_ins FOR DELETE
  USING (public.is_group_admin(public.game_group_id(game_id)));

-- ============================================
-- EXPENSES
-- ============================================
CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));

CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE
  USING (public.is_group_admin(public.game_group_id(game_id)));

-- ============================================
-- EXPENSE PARTICIPANTS
-- ============================================
CREATE POLICY "expense_participants_select"
  ON public.expense_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND public.is_group_member(public.game_group_id(e.game_id))
    )
  );

CREATE POLICY "expense_participants_insert"
  ON public.expense_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND public.is_group_admin(public.game_group_id(e.game_id))
    )
  );

-- ============================================
-- CASH-OUTS
-- ============================================
CREATE POLICY "cash_outs_select"
  ON public.cash_outs FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

CREATE POLICY "cash_outs_insert"
  ON public.cash_outs FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));

CREATE POLICY "cash_outs_update"
  ON public.cash_outs FOR UPDATE
  USING (public.is_group_admin(public.game_group_id(game_id)));

-- ============================================
-- GAME RESULTS (read for members, write for admins)
-- ============================================
CREATE POLICY "game_results_select"
  ON public.game_results FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

CREATE POLICY "game_results_insert"
  ON public.game_results FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));

-- ============================================
-- SETTLEMENTS (read for members, write for admins)
-- ============================================
CREATE POLICY "settlements_select"
  ON public.settlements FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

CREATE POLICY "settlements_insert"
  ON public.settlements FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));
