-- ============================================
-- Royal Cash v2 - Initial Schema
-- ============================================

-- profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- group_members
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- players (may or may not be linked to a user)
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  linked_user_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- games
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  default_buy_in INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  status TEXT NOT NULL CHECK (status IN ('active', 'closed', 'archived')) DEFAULT 'active',
  management_mode TEXT NOT NULL CHECK (management_mode IN ('host_only', 'multiple_managers')) DEFAULT 'host_only',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- game_players
CREATE TABLE public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  is_manager BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

-- buy_ins (event-based)
CREATE TABLE public.buy_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

-- expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  paid_by_player_id UUID NOT NULL REFERENCES public.players(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  split_type TEXT NOT NULL CHECK (split_type IN ('equal_split', 'custom_split', 'personal')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- expense_participants
CREATE TABLE public.expense_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id),
  amount_owed INTEGER NOT NULL
);

-- cash_outs (one per player per game)
CREATE TABLE public.cash_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

-- game_results (snapshot on close, for stats)
CREATE TABLE public.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id),
  total_buy_in INTEGER NOT NULL,
  cash_out INTEGER NOT NULL,
  game_net INTEGER NOT NULL,
  expense_credit INTEGER NOT NULL DEFAULT 0,
  expense_debt INTEGER NOT NULL DEFAULT 0,
  final_balance INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

-- settlements (snapshot on close)
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  from_player_id UUID NOT NULL REFERENCES public.players(id),
  to_player_id UUID NOT NULL REFERENCES public.players(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_groups_owner ON public.groups(owner_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_players_group ON public.players(group_id);
CREATE INDEX idx_games_group ON public.games(group_id);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_game_players_game ON public.game_players(game_id);
CREATE INDEX idx_game_players_player ON public.game_players(player_id);
CREATE INDEX idx_buy_ins_game ON public.buy_ins(game_id);
CREATE INDEX idx_buy_ins_player ON public.buy_ins(player_id);
CREATE INDEX idx_expenses_game ON public.expenses(game_id);
CREATE INDEX idx_expense_participants_expense ON public.expense_participants(expense_id);
CREATE INDEX idx_cash_outs_game ON public.cash_outs(game_id);
CREATE INDEX idx_game_results_game ON public.game_results(game_id);
CREATE INDEX idx_game_results_player ON public.game_results(player_id);
CREATE INDEX idx_settlements_game ON public.settlements(game_id);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER cash_outs_updated_at
  BEFORE UPDATE ON public.cash_outs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
