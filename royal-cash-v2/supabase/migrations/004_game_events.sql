-- ============================================
-- Royal Cash v2 - Game activity log
-- ============================================

CREATE TABLE public.game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('buy_in_added', 'buy_in_removed', 'expense_added')
  ),
  player_id UUID REFERENCES public.players(id),
  amount INTEGER,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_events_game ON public.game_events(game_id);
CREATE INDEX idx_game_events_created ON public.game_events(game_id, created_at DESC);

ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_events_select"
  ON public.game_events FOR SELECT
  USING (public.is_group_member(public.game_group_id(game_id)));

CREATE POLICY "game_events_insert"
  ON public.game_events FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));
