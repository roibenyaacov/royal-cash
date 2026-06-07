-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================
-- This fixes the recursion issue in table_players policies
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;

DROP POLICY IF EXISTS "Users can view accessible tables" ON public.tables;

-- ============================================
-- FIXED POLICIES (No recursion)
-- ============================================

-- TABLE_PLAYERS: View - Simple check without recursion
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        -- User can see players if they own the table OR they are a player themselves
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

-- TABLE_PLAYERS: Insert - Simple check
CREATE POLICY "Users can insert table players" ON public.table_players
    FOR INSERT
    WITH CHECK (
        -- User can add themselves OR owner can add players
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

-- TABLE_PLAYERS: Update - Simple check
CREATE POLICY "Users can update table players" ON public.table_players
    FOR UPDATE
    USING (
        -- User can update their own record OR owner can update
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

-- TABLES: View - Fixed to avoid recursion
CREATE POLICY "Users can view accessible tables" ON public.tables
    FOR SELECT
    USING (
        -- User owns the table OR user is in table_players (but check directly, not through tables)
        owner_id = auth.uid() OR
        id IN (
            SELECT table_id 
            FROM public.table_players 
            WHERE user_id = auth.uid()
        )
    );

-- Verify the policies
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('tables', 'table_players')
ORDER BY tablename, policyname;

