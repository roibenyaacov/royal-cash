-- ============================================
-- CHECK RLS STATUS
-- ============================================
-- Run this to see what policies exist
-- ============================================

-- Check if game_logs table exists
SELECT 
    'game_logs table' as check_item,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_logs'
    ) as exists;

-- Check all policies for table_players
SELECT 
    'table_players policies' as check_item,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'table_players'
ORDER BY policyname;

-- Check all policies for game_logs
SELECT 
    'game_logs policies' as check_item,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'game_logs'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
    'RLS Status' as check_item,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('table_players', 'game_logs', 'tables');


