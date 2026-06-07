-- ============================================
-- Public RPC to read claim invite info by token
-- Needed because the invitee is NOT yet a group member,
-- so RLS on player_claim_invites blocks a direct SELECT.
-- SECURITY DEFINER bypasses RLS safely — only reads player name.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_claim_invite_info(claim_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  invite RECORD;
  player RECORD;
BEGIN
  SELECT * INTO invite
    FROM public.player_claim_invites
    WHERE token = claim_token AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_used_token');
  END IF;

  IF invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  SELECT id, display_name, group_id INTO player
    FROM public.players
    WHERE id = invite.player_id;

  RETURN jsonb_build_object(
    'success',     true,
    'player_id',   player.id,
    'player_name', player.display_name,
    'group_id',    player.group_id
  );
END;
$$;

-- Allow both anonymous (pre-login) and authenticated users to call this
GRANT EXECUTE ON FUNCTION public.get_claim_invite_info(TEXT) TO anon, authenticated;
