-- ============================================
-- FIX EXISTING TABLES - ROYAL CASH APP
-- ============================================
-- This script fixes existing tables that have wrong data types
-- Run this if you get foreign key constraint errors
-- ============================================

-- ============================================
-- STEP 1: Drop existing tables if they exist
-- (Only if you don't have important data!)
-- ============================================
-- WARNING: This will delete all existing data!
-- If you have important data, skip this step and use the migration script instead

DROP TABLE IF EXISTS public.game_results CASCADE;
DROP TABLE IF EXISTS public.table_players CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- STEP 2: Create tables with correct types
-- ============================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLES TABLE (with UUID id)
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    buy_in INTEGER NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE_PLAYERS TABLE
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

-- 4. GAME_RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.game_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    net_profit NUMERIC NOT NULL,
    game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tables_owner ON public.tables(owner_id);
CREATE INDEX IF NOT EXISTS idx_tables_active ON public.tables(is_active);
CREATE INDEX IF NOT EXISTS idx_table_players_table ON public.table_players(table_id);
CREATE INDEX IF NOT EXISTS idx_table_players_user ON public.table_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_table ON public.game_results(table_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user ON public.game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_date ON public.game_results(game_date);

-- ============================================
-- STEP 4: Enable Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Drop existing policies (if any)
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
-- STEP 6: Create RLS Policies
-- ============================================

-- PROFILES POLICIES
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- TABLES POLICIES
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

CREATE POLICY "Users can create tables" ON public.tables
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update tables" ON public.tables
    FOR UPDATE
    USING (owner_id = auth.uid());

-- TABLE_PLAYERS POLICIES
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

CREATE POLICY "Users can insert table players" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update table players" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id FROM public.tables WHERE owner_id = auth.uid()
        )
    );

-- GAME_RESULTS POLICIES
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
-- All tables have been recreated with correct types
-- and all policies have been set up.
-- You can now use the app!

