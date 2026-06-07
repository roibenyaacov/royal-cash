-- ============================================
-- TEST SETUP - ROYAL CASH APP
-- ============================================
-- Run this to check if everything is set up correctly
-- ============================================

-- Check if tables exist
SELECT 
    'profiles' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
         THEN '✓ EXISTS' 
         ELSE '✗ MISSING' 
    END as status;

SELECT 
    'tables' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tables') 
         THEN '✓ EXISTS' 
         ELSE '✗ MISSING' 
    END as status;

SELECT 
    'table_players' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'table_players') 
         THEN '✓ EXISTS' 
         ELSE '✗ MISSING' 
    END as status;

SELECT 
    'game_results' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_results') 
         THEN '✓ EXISTS' 
         ELSE '✗ MISSING' 
    END as status;

-- Check table columns and types
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'tables', 'table_players', 'game_results')
ORDER BY table_name, ordinal_position;

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'tables', 'table_players', 'game_results');

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'tables', 'table_players', 'game_results')
ORDER BY tablename, policyname;

