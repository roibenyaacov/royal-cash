-- Claim hardening: one linked user per group, auth guard, invite info checks

CREATE UNIQUE INDEX IF NOT EXISTS players_one_linked_user_per_group
  ON public.players (group_id, linked_user_id)
  WHERE linked_user_id IS NOT NULL;

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

  SELECT id, display_name, group_id, linked_user_id INTO player
    FROM public.players
    WHERE id = invite.player_id;

  IF player.linked_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'player_already_linked');
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.players
    WHERE group_id = player.group_id
      AND linked_user_id = auth.uid()
      AND id != player.id
  ) THEN
    RETURN jsonb_build_object('error', 'user_already_linked_in_group');
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'player_id',   player.id,
    'player_name', player.display_name,
    'group_id',    player.group_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_player(claim_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invite RECORD;
  target_player RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

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

  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE group_id = target_player.group_id
      AND linked_user_id = auth.uid()
      AND id != invite.player_id
  ) THEN
    RETURN jsonb_build_object('error', 'user_already_linked_in_group');
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_player(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_player(TEXT) TO authenticated;
