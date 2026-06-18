-- ============================================
-- Fixes:
--   H1 — accept_group_invite race on max_uses (no FOR UPDATE)
--   M2 — SECURITY DEFINER helpers missing `SET search_path`
-- Idempotent: safe to re-run.
-- ============================================

-- Helper functions — pin search_path to avoid extension/schema hijacking
ALTER FUNCTION public.is_group_member(UUID)  SET search_path = public;
ALTER FUNCTION public.is_group_admin(UUID)   SET search_path = public;
ALTER FUNCTION public.game_group_id(UUID)    SET search_path = public;
ALTER FUNCTION public.player_group_id(UUID)  SET search_path = public;
ALTER FUNCTION public.can_manage_active_game(UUID) SET search_path = public;

-- Rewrite accept_group_invite with row lock so two simultaneous redemptions
-- of a max_uses-limited invite cannot both succeed.
CREATE OR REPLACE FUNCTION public.accept_group_invite(invite_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite RECORD;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Lock the invite row for the duration of the transaction so two
  -- concurrent calls cannot both pass the use_count check and exceed
  -- max_uses by one.
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

  -- Already a member: return success without consuming a use.
  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = invite.group_id AND user_id = uid
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'group_id', invite.group_id,
      'already_member', true
    );
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (invite.group_id, uid, invite.role);

  UPDATE public.group_invites
    SET use_count = use_count + 1
    WHERE id = invite.id;

  RETURN jsonb_build_object('success', true, 'group_id', invite.group_id);
END;
$$;
