-- ==============================================================================
-- FIX: Add DELETE Policy for table_players
-- ==============================================================================
-- This script adds the missing DELETE policy for the table_players table
-- so that table owners and players can remove players from the table.
-- ==============================================================================

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Table owners and players can delete players" ON public.table_players;

-- Create DELETE policy for table_players
-- Allow DELETE if:
-- 1. User is the table owner, OR
-- 2. User is removing themselves from the table
CREATE POLICY "Table owners and players can delete players"
ON public.table_players
FOR DELETE
USING (
    -- User is the table owner
    EXISTS (
        SELECT 1 FROM public.tables
        WHERE tables.id = table_players.table_id
        AND tables.owner_id = auth.uid()
    )
    OR
    -- User is removing themselves
    table_players.user_id = auth.uid()
);

-- Verify the policy was created
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'table_players'
ORDER BY cmd, policyname;
