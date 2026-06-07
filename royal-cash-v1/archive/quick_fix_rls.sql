-- ============================================
-- QUICK FIX - RLS POLICIES
-- ============================================
-- Run this FIRST to fix the immediate issue
-- ============================================

-- Drop ALL existing policies for table_players
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'table_players') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.table_players';
    END LOOP;
END $$;

-- Drop ALL existing policies for game_logs
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'game_logs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.game_logs';
    END LOOP;
END $$;

-- Create game_logs table if it doesn't exist
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

-- Enable RLS
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE NEW POLICIES FOR TABLE_PLAYERS
-- ============================================

-- View: Owner can ALWAYS see, OR user is a player
CREATE POLICY "table_players_select" ON public.table_players
    FOR SELECT
    USING (
        -- Owner can always see (CRITICAL for empty tables)
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        ) OR
        -- OR user is a player
        user_id = auth.uid() OR
        table_id IN (
            SELECT table_id 
            FROM public.table_players 
            WHERE user_id = auth.uid()
        )
    );

-- Insert: User can add themselves OR owner can add
CREATE POLICY "table_players_insert" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        )
    );

-- Update: User can update themselves OR owner can update
CREATE POLICY "table_players_update" ON public.table_players
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
-- CREATE NEW POLICIES FOR GAME_LOGS
-- ============================================

-- View: Owner OR player can see logs
CREATE POLICY "game_logs_select" ON public.game_logs
    FOR SELECT
    USING (
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        ) OR
        table_id IN (
            SELECT table_id 
            FROM public.table_players 
            WHERE user_id = auth.uid()
        )
    );

-- Insert: User can add logs for tables they own or play in
CREATE POLICY "game_logs_insert" ON public.game_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        (
            table_id IN (
                SELECT id 
                FROM public.tables 
                WHERE owner_id = auth.uid()
            ) OR
            table_id IN (
                SELECT table_id 
                FROM public.table_players 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- VERIFY
-- ============================================
SELECT 'Policies created successfully!' as status;

SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('table_players', 'game_logs')
ORDER BY tablename, policyname;


