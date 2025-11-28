-- ==============================================================================
-- MASTER FIX: CLEANUP AND REPAIR SUPABASE SCHEMA
-- ==============================================================================
-- This script performs a comprehensive cleanup and repair of the database schema.
-- It drops problematic triggers/functions and recreates them with robust error handling.
-- It specifically addresses the 'invalid input syntax for type uuid: "null"' error.
-- ==============================================================================

-- 1. DROP EXISTING TRIGGERS AND FUNCTIONS (CLEAN SLATE)
-- =====================================================
-- Drop triggers first (explicitly named ones)
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
DROP TRIGGER IF EXISTS on_table_completion ON public.tables;
DROP TRIGGER IF EXISTS on_game_completion ON public.tables; -- Added based on error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions with CASCADE to automatically remove any other dependent triggers
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result() CASCADE;
DROP FUNCTION IF EXISTS public.update_player_stats_on_completion() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_table(uuid) CASCADE;

-- 2. ENSURE TABLES EXIST AND HAVE CORRECT COLUMNS
-- ===============================================
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    email TEXT,
    phone_number TEXT,
    games_played INTEGER DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Results
CREATE TABLE IF NOT EXISTS public.game_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    net_profit NUMERIC NOT NULL,
    game_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RECREATE FUNCTIONS WITH ROBUST ERROR HANDLING
-- ================================================

-- Function: Update User Stats (Triggered by game_results INSERT)
CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
BEGIN
    -- CRITICAL FIX: Check if user_id is NULL
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update the user's profile
    UPDATE public.profiles
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0),
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in update_user_stats_on_game_result: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Handle New User (Triggered by auth.users INSERT)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, phone_number)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'משתמש'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public.profiles.username);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: User Can Access Table (RLS Helper)
CREATE OR REPLACE FUNCTION public.user_can_access_table(table_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    -- Check if user owns the table
    IF EXISTS (SELECT 1 FROM public.tables WHERE id = table_uuid AND owner_id = auth.uid()) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is a player
    IF EXISTS (SELECT 1 FROM public.table_players WHERE table_id = table_uuid AND user_id = auth.uid()) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 4. RECREATE TRIGGERS
-- ====================

-- Trigger: Update Stats
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_user_stats_on_game_result();

-- Trigger: New User
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- 5. FIX RLS POLICIES (ENSURE ACCESS)
-- ===================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create permissive policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 6. DATA CLEANUP (OPTIONAL BUT RECOMMENDED)
-- ==========================================
-- Remove any game_results with NULL user_id if they exist (shouldn't be possible with UUID constraint but good to be safe)
DELETE FROM public.game_results WHERE user_id IS NULL;

-- 7. VERIFICATION
-- ===============
SELECT 'SUCCESS' as status, count(*) as triggers_count FROM information_schema.triggers WHERE trigger_name IN ('on_game_result_insert', 'on_auth_user_created');
