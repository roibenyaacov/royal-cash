-- ============================================
-- CREATE ALL TABLES FOR ROYAL CASH APP
-- ============================================
-- Run this script FIRST in Supabase SQL Editor
-- This creates all the required tables
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    buy_in INTEGER NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TABLE_PLAYERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.table_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rebuys INTEGER DEFAULT 1,
    food_credit NUMERIC DEFAULT 0,
    food_debt NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(table_id, user_id)
);

-- ============================================
-- 4. GAME_RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    net_profit NUMERIC NOT NULL,
    game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tables_owner ON public.tables(owner_id);
CREATE INDEX IF NOT EXISTS idx_tables_active ON public.tables(is_active);
CREATE INDEX IF NOT EXISTS idx_table_players_table ON public.table_players(table_id);
CREATE INDEX IF NOT EXISTS idx_table_players_user ON public.table_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_table ON public.game_results(table_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user ON public.game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_date ON public.game_results(game_date);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view accessible tables" ON public.tables;
DROP POLICY IF EXISTS "Users can create tables" ON public.tables;
DROP POLICY IF EXISTS "Owners can update tables" ON public.tables;
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can view game results" ON public.game_results;
DROP POLICY IF EXISTS "Users can insert game results" ON public.game_results;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Allow users to insert their own profile (CRITICAL FOR SIGNUP)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to view profiles of other users (needed for username lookup)
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- TABLES POLICIES
-- ============================================

-- Allow users to view tables they own or participate in
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

-- Allow users to create tables (they become owner)
CREATE POLICY "Users can create tables" ON public.tables
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Allow owners to update their tables
CREATE POLICY "Owners can update tables" ON public.tables
    FOR UPDATE
    USING (owner_id = auth.uid());

-- ============================================
-- TABLE_PLAYERS POLICIES
-- ============================================

-- Allow users to view players in tables they have access to
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        table_id IN (
            SELECT id FROM public.tables 
            WHERE owner_id = auth.uid() OR
            id IN (
                SELECT table_id FROM public.table_players 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow users to insert themselves as players OR if they own the table
CREATE POLICY "Users can insert table players" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

-- Allow users to update their own player record OR if they own the table
CREATE POLICY "Users can update table players" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- GAME_RESULTS POLICIES
-- ============================================

-- Allow users to view game results from tables they have access to
CREATE POLICY "Users can view game results" ON public.game_results
    FOR SELECT
    USING (
        table_id IN (
            SELECT id FROM public.tables 
            WHERE owner_id = auth.uid() OR
            id IN (
                SELECT table_id FROM public.table_players 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow users to insert game results for tables they own
CREATE POLICY "Users can insert game results" ON public.game_results
    FOR INSERT
    WITH CHECK (
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- SUCCESS!
-- ============================================
-- All tables and policies have been created.
-- You can now use the app!

