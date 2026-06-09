-- Add removed_at timestamp to players (soft-delete tracking)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- Add archived_at timestamp to groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Update groups SELECT policy to hide archived groups from members
DROP POLICY IF EXISTS "groups_select_member" ON public.groups;
CREATE POLICY "groups_select_member"
  ON public.groups FOR SELECT
  USING (public.is_group_member(id) AND archived_at IS NULL);
