-- ============================================
-- FIX INFINITE RECURSION - FINAL SOLUTION
-- ============================================
-- This completely fixes the recursion issue
-- ============================================

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can view accessible tables" ON public.tables;
DROP POLICY IF EXISTS "Users can create tables" ON public.tables;
DROP POLICY IF EXISTS "Owners can update tables" ON public.tables;

-- ============================================
-- NEW POLICIES - NO RECURSION
-- ============================================

-- TABLES: View - Check ownership directly, then check table_players separately
CREATE POLICY "Users can view accessible tables" ON public.tables
    FOR SELECT
    USING (
        owner_id = auth.uid()
    );

-- TABLES: View - Allow if user is a player (separate policy to avoid recursion)
CREATE POLICY "Users can view tables they play in" ON public.tables
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.table_players 
            WHERE table_players.table_id = tables.id 
            AND table_players.user_id = auth.uid()
        )
    );

-- TABLES: Create
CREATE POLICY "Users can create tables" ON public.tables
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- TABLES: Update
CREATE POLICY "Owners can update tables" ON public.tables
    FOR UPDATE
    USING (owner_id = auth.uid());

-- TABLE_PLAYERS: View - Only check ownership, not through tables
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 
            FROM public.tables 
            WHERE tables.id = table_players.table_id 
            AND tables.owner_id = auth.uid()
        )
    );

-- TABLE_PLAYERS: Insert
CREATE POLICY "Users can insert table players" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 
            FROM public.tables 
            WHERE tables.id = table_players.table_id 
            AND tables.owner_id = auth.uid()
        )
    );

-- TABLE_PLAYERS: Update
CREATE POLICY "Users can update table players" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 
            FROM public.tables 
            WHERE tables.id = table_players.table_id 
            AND tables.owner_id = auth.uid()
        )
    );

-- ============================================
-- VERIFY
-- ============================================
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('tables', 'table_players')
ORDER BY tablename, policyname;

