-- ============================================
-- Royal Cash v2 - Invites, Claims, Access Links
-- ============================================

-- player_claim_invites: link a manual player to a Google account
CREATE TABLE public.player_claim_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_by UUID REFERENCES public.profiles(id),
  claimed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'claimed', 'expired', 'revoked'))
    DEFAULT 'pending'
);

-- group_invites: join a group via a shared link
CREATE TABLE public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'member')) DEFAULT 'member',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked'))
    DEFAULT 'active'
);

-- game_access_links: view a specific game without being a group member
CREATE TABLE public.game_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'participate'))
    DEFAULT 'view',
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked'))
    DEFAULT 'active'
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_player_claim_invites_token ON public.player_claim_invites(token);
CREATE INDEX idx_player_claim_invites_player ON public.player_claim_invites(player_id);
CREATE INDEX idx_group_invites_token ON public.group_invites(token);
CREATE INDEX idx_group_invites_group ON public.group_invites(group_id);
CREATE INDEX idx_game_access_links_token ON public.game_access_links(token);
CREATE INDEX idx_game_access_links_game ON public.game_access_links(game_id);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.player_claim_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_access_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS: player_claim_invites
-- ============================================

-- Helper: get group_id for a player
CREATE OR REPLACE FUNCTION public.player_group_id(check_player_id UUID)
RETURNS UUID AS $$
  SELECT group_id FROM public.players WHERE id = check_player_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "player_claim_invites_select"
  ON public.player_claim_invites FOR SELECT
  USING (public.is_group_admin(public.player_group_id(player_id)));

CREATE POLICY "player_claim_invites_insert"
  ON public.player_claim_invites FOR INSERT
  WITH CHECK (public.is_group_admin(public.player_group_id(player_id)));

CREATE POLICY "player_claim_invites_update"
  ON public.player_claim_invites FOR UPDATE
  USING (public.is_group_admin(public.player_group_id(player_id)));

-- ============================================
-- RLS: group_invites
-- ============================================
CREATE POLICY "group_invites_select"
  ON public.group_invites FOR SELECT
  USING (public.is_group_admin(group_id));

CREATE POLICY "group_invites_insert"
  ON public.group_invites FOR INSERT
  WITH CHECK (public.is_group_admin(group_id));

CREATE POLICY "group_invites_update"
  ON public.group_invites FOR UPDATE
  USING (public.is_group_admin(group_id));

-- ============================================
-- RLS: game_access_links
-- ============================================
CREATE POLICY "game_access_links_select"
  ON public.game_access_links FOR SELECT
  USING (public.is_group_admin(public.game_group_id(game_id)));

CREATE POLICY "game_access_links_insert"
  ON public.game_access_links FOR INSERT
  WITH CHECK (public.is_group_admin(public.game_group_id(game_id)));

CREATE POLICY "game_access_links_update"
  ON public.game_access_links FOR UPDATE
  USING (public.is_group_admin(public.game_group_id(game_id)));

-- ============================================
-- Atomic claim_player function
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_player(claim_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invite RECORD;
  target_player RECORD;
BEGIN
  SELECT * INTO invite FROM public.player_claim_invites
    WHERE token = claim_token AND status = 'pending'
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_used_token');
  END IF;

  IF invite.expires_at < now() THEN
    UPDATE public.player_claim_invites SET status = 'expired' WHERE id = invite.id;
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  SELECT * INTO target_player FROM public.players WHERE id = invite.player_id;

  IF target_player.linked_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'player_already_linked');
  END IF;

  UPDATE public.players
    SET linked_user_id = auth.uid()
    WHERE id = invite.player_id;

  UPDATE public.player_claim_invites
    SET status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
    WHERE id = invite.id;

  INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (target_player.group_id, auth.uid(), 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'group_id', target_player.group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Atomic accept_group_invite function
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_group_invite(invite_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invite RECORD;
BEGIN
  SELECT * INTO invite FROM public.group_invites
    WHERE token = invite_token AND status = 'active'
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_revoked_token');
  END IF;

  IF invite.expires_at IS NOT NULL AND invite.expires_at < now() THEN
    UPDATE public.group_invites SET status = 'expired' WHERE id = invite.id;
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  IF invite.max_uses IS NOT NULL AND invite.use_count >= invite.max_uses THEN
    RETURN jsonb_build_object('error', 'max_uses_reached');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = invite.group_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', true, 'group_id', invite.group_id, 'already_member', true);
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (invite.group_id, auth.uid(), invite.role);

  UPDATE public.group_invites
    SET use_count = use_count + 1
    WHERE id = invite.id;

  RETURN jsonb_build_object('success', true, 'group_id', invite.group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Validate game access token (read-only, no auth required)
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_game_access(access_token TEXT)
RETURNS JSONB AS $$
DECLARE
  link RECORD;
  target_game RECORD;
BEGIN
  SELECT * INTO link FROM public.game_access_links
    WHERE token = access_token AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_revoked_token');
  END IF;

  IF link.expires_at IS NOT NULL AND link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  SELECT * INTO target_game FROM public.games WHERE id = link.game_id;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', link.game_id,
    'group_id', target_game.group_id,
    'access_level', link.access_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
