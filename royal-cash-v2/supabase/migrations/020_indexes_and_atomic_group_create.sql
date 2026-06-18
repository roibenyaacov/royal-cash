-- ============================================
-- Fixes:
--   M6 — missing indexes that hot paths rely on
--   M8 — atomic group + owner-member creation via RPC
-- Idempotent: safe to re-run.
-- ============================================

-- Linked-player lookups (profile stats, link_player_to_self, player sheet).
CREATE INDEX IF NOT EXISTS idx_players_linked_user
  ON public.players(linked_user_id)
  WHERE linked_user_id IS NOT NULL;

-- Per-player cashout lookup (used by validation reads + history queries).
CREATE INDEX IF NOT EXISTS idx_cash_outs_player
  ON public.cash_outs(player_id);

-- Per-player expense participation (used by personal stats joins).
CREATE INDEX IF NOT EXISTS idx_expense_participants_player
  ON public.expense_participants(player_id);

-- Per-player game-results fan-out (already exists via 001, kept for clarity).
-- idx_game_results_player exists; no-op.

-- Invite & access-link expiry sweeps (small tables, cheap index).
CREATE INDEX IF NOT EXISTS idx_player_claim_invites_expires
  ON public.player_claim_invites(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_group_invites_expires
  ON public.group_invites(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_access_links_expires
  ON public.game_access_links(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================
-- M8 — atomic create_group_with_owner
-- Single-transaction insert of the group row + the owner's group_members
-- row, so a partial failure can never leave an orphan group.
-- ============================================
CREATE OR REPLACE FUNCTION public.create_group_with_owner(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  new_id UUID := gen_random_uuid();
  trimmed TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  trimmed := trim(coalesce(p_name, ''));
  IF trimmed = '' THEN
    RETURN jsonb_build_object('error', 'empty_name');
  END IF;

  INSERT INTO public.groups (id, name, owner_id)
    VALUES (new_id, trimmed, uid);

  INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (new_id, uid, 'owner');

  RETURN jsonb_build_object('success', true, 'group_id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_with_owner(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_with_owner(TEXT) TO authenticated;
