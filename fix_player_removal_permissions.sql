-- ==============================================================================
-- FIX: Update DELETE Policy for table_players
-- ==============================================================================
-- This script updates the DELETE policy so that ONLY the table owner
-- can remove players. Players can no longer remove themselves.
-- However, all players can still update rebuys (entries) via the UPDATE policy.
-- ==============================================================================

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Table owners and players can delete players" ON public.table_players;
DROP POLICY IF EXISTS "tp_delete_owner_or_self" ON public.table_players;

-- Create NEW DELETE policy - ONLY table owner can delete players
CREATE POLICY "Only table owner can delete players"
ON public.table_players
FOR DELETE
USING (
    -- Only the table owner can delete players
    EXISTS (
        SELECT 1 FROM public.tables
        WHERE tables.id = table_players.table_id
        AND tables.owner_id = auth.uid()
    )
);

-- ==============================================================================
-- VERIFY: Check that UPDATE policy still allows all players to update rebuys
-- ==============================================================================
-- This query shows the current policies - UPDATE should allow player OR owner
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'table_players'
ORDER BY cmd, policyname;

-- ==============================================================================
-- Expected Result:
-- ==============================================================================
-- DELETE policy: Only owner can delete
-- UPDATE policy: Player can update themselves OR owner can update (for rebuys)
-- ==============================================================================
