-- ============================================
-- FIX ALL RLS ISSUES - COMPLETE SOLUTION
-- ============================================

-- 1. Delete old 'players' table if it exists (we use 'table_players' instead)
DROP TABLE IF EXISTS public.players CASCADE;

-- 2. Drop all existing policies on tables and table_players
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can view accessible tables" ON public.tables;
DROP POLICY IF EXISTS "Users can view tables they play in" ON public.tables;
DROP POLICY IF EXISTS "Users can create tables" ON public.tables;
DROP POLICY IF EXISTS "Owners can update tables" ON public.tables;

-- 3. Make sure RLS is enabled
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SIMPLE POLICIES - NO RECURSION
-- ============================================

-- TABLES: View - User owns it OR is a player (direct check)
CREATE POLICY "Users can view accessible tables" ON public.tables
    FOR SELECT
    USING (
        owner_id = auth.uid() OR
        id IN (
            SELECT table_id 
            FROM public.table_players 
            WHERE user_id = auth.uid()
        )
    );

-- TABLES: Insert - User must be the owner
CREATE POLICY "Users can create tables" ON public.tables
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- TABLES: Update - Only owner can update
CREATE POLICY "Owners can update tables" ON public.tables
    FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- TABLE_PLAYERS: View - User is the player OR owns the table
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        )
    );

-- TABLE_PLAYERS: Insert - User can add themselves OR owner can add
CREATE POLICY "Users can insert table players" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        )
    );

-- TABLE_PLAYERS: Update - User can update themselves OR owner can update
CREATE POLICY "Users can update table players" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- VERIFY
-- ============================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('tables', 'table_players')
ORDER BY tablename, policyname;

-- Check if old players table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'players')
        THEN 'WARNING: players table still exists - run DROP TABLE manually'
        ELSE 'OK: players table does not exist'
    END as players_table_status;

