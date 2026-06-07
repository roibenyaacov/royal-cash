-- ============================================
-- COMPLETE RLS FIX - AGGRESSIVE VERSION
-- ============================================
-- This script will FORCE fix all RLS issues
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create game_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.game_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_description TEXT NOT NULL,
    old_value NUMERIC,
    new_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS on all tables
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Step 3: DROP ALL EXISTING POLICIES (using DO block to handle all cases)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all table_players policies
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'table_players'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.table_players', r.policyname);
    END LOOP;
    
    -- Drop all game_logs policies
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'game_logs'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.game_logs', r.policyname);
    END LOOP;
END $$;

-- Step 4: Create SIMPLE and WORKING policies for table_players
-- SELECT: Owner OR player can see all players in the table
CREATE POLICY "tp_select_owner_or_player" ON public.table_players
    FOR SELECT
    USING (
        -- Owner can see
        EXISTS (
            SELECT 1 FROM public.tables 
            WHERE id = table_players.table_id 
            AND owner_id = auth.uid()
        )
        OR
        -- OR user is a player in this table
        user_id = auth.uid()
        OR
        -- OR user is a player in ANY table that matches
        EXISTS (
            SELECT 1 FROM public.table_players tp2
            WHERE tp2.table_id = table_players.table_id
            AND tp2.user_id = auth.uid()
        )
    );

-- INSERT: User can add themselves OR owner can add
CREATE POLICY "tp_insert_self_or_owner" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.tables 
            WHERE id = table_players.table_id 
            AND owner_id = auth.uid()
        )
    );

-- UPDATE: User can update themselves OR owner can update
CREATE POLICY "tp_update_self_or_owner" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.tables 
            WHERE id = table_players.table_id 
            AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.tables 
            WHERE id = table_players.table_id 
            AND owner_id = auth.uid()
        )
    );

-- Step 5: Create policies for game_logs
-- SELECT: Owner OR player can see logs
CREATE POLICY "gl_select_owner_or_player" ON public.game_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tables 
            WHERE id = game_logs.table_id 
            AND owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.table_players
            WHERE table_id = game_logs.table_id
            AND user_id = auth.uid()
        )
    );

-- INSERT: User can add logs for tables they own or play in
CREATE POLICY "gl_insert_owner_or_player" ON public.game_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM public.tables 
                WHERE id = game_logs.table_id 
                AND owner_id = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM public.table_players
                WHERE table_id = game_logs.table_id
                AND user_id = auth.uid()
            )
        )
    );

-- Step 6: Verify policies were created
SELECT 
    'Verification' as step,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('table_players', 'game_logs')
ORDER BY tablename, policyname;

-- Step 7: Test query (this should work if policies are correct)
-- Uncomment to test:
-- SELECT COUNT(*) as table_players_count FROM public.table_players;
-- SELECT COUNT(*) as game_logs_count FROM public.game_logs;

SELECT 'RLS policies fixed successfully!' as status;


