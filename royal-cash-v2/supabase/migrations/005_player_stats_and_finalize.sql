-- ============================================
-- Player stats, win records, game finalization
-- ============================================

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Backfill: existing closed games appear in history
UPDATE public.games
SET finalized_at = closed_at
WHERE status = 'closed'
  AND finalized_at IS NULL
  AND closed_at IS NOT NULL;

CREATE TABLE public.player_group_stats (
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  total_balance INTEGER NOT NULL DEFAULT 0,
  biggest_win INTEGER NOT NULL DEFAULT 0 CHECK (biggest_win >= 0),
  biggest_loss INTEGER NOT NULL DEFAULT 0 CHECK (biggest_loss <= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, group_id)
);

CREATE TABLE public.group_win_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_group_stats_group ON public.player_group_stats(group_id);
CREATE INDEX idx_group_win_records_group ON public.group_win_records(group_id);
CREATE INDEX idx_group_win_records_amount ON public.group_win_records(group_id, amount DESC);
CREATE INDEX idx_games_finalized ON public.games(group_id, finalized_at DESC);

CREATE TRIGGER player_group_stats_updated_at
  BEFORE UPDATE ON public.player_group_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.player_group_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_win_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_group_stats_select"
  ON public.player_group_stats FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "player_group_stats_insert"
  ON public.player_group_stats FOR INSERT
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "player_group_stats_update"
  ON public.player_group_stats FOR UPDATE
  USING (public.is_group_member(group_id));

CREATE POLICY "group_win_records_select"
  ON public.group_win_records FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "group_win_records_insert"
  ON public.group_win_records FOR INSERT
  WITH CHECK (public.is_group_member(group_id));
