-- ============================================
-- FIX RLS POLICIES FOR ROYAL CASH APP
-- ============================================
-- Run this script in Supabase SQL Editor to fix the signup issue
-- ============================================

-- 1. Enable RLS on all tables (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view accessible tables" ON tables;
DROP POLICY IF EXISTS "Users can create tables" ON tables;
DROP POLICY IF EXISTS "Owners can update tables" ON tables;
DROP POLICY IF EXISTS "Users can view table players" ON table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON table_players;
DROP POLICY IF EXISTS "Users can update table players" ON table_players;
DROP POLICY IF EXISTS "Users can view game results" ON game_results;
DROP POLICY IF EXISTS "Users can insert game results" ON game_results;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Allow users to insert their own profile (CRITICAL FOR SIGNUP)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to view profiles of other users (needed for username lookup)
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- TABLES POLICIES
-- ============================================

-- Allow users to view tables they own or participate in
CREATE POLICY "Users can view accessible tables" ON tables
    FOR SELECT
    USING (
        owner_id = auth.uid() OR
        id IN (
            SELECT table_id 
            FROM table_players 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to create tables (they become owner)
CREATE POLICY "Users can create tables" ON tables
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Allow owners to update their tables
CREATE POLICY "Owners can update tables" ON tables
    FOR UPDATE
    USING (owner_id = auth.uid());

-- ============================================
-- TABLE_PLAYERS POLICIES
-- ============================================

-- Allow users to view players in tables they have access to
CREATE POLICY "Users can view table players" ON table_players
    FOR SELECT
    USING (
        table_id IN (
            SELECT id FROM tables 
            WHERE owner_id = auth.uid() OR
            id IN (
                SELECT table_id FROM table_players 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow users to insert themselves as players OR if they own the table
CREATE POLICY "Users can insert table players" ON table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM tables WHERE owner_id = auth.uid()
        )
    );

-- Allow users to update their own player record OR if they own the table
CREATE POLICY "Users can update table players" ON table_players
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM tables WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- GAME_RESULTS POLICIES
-- ============================================

-- Allow users to view game results from tables they have access to
CREATE POLICY "Users can view game results" ON game_results
    FOR SELECT
    USING (
        table_id IN (
            SELECT id FROM tables 
            WHERE owner_id = auth.uid() OR
            id IN (
                SELECT table_id FROM table_players 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow users to insert game results for tables they own
CREATE POLICY "Users can insert game results" ON game_results
    FOR INSERT
    WITH CHECK (
        table_id IN (
            SELECT id FROM tables WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, try signing up again.
-- The error should be resolved!

