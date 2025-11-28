-- ============================================
-- COMPLETE FIX - RLS & GAME LOGS
-- ============================================
-- Run this to fix all RLS issues and create game_logs
-- ============================================

-- 1. CREATE GAME_LOGS TABLE
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_logs_table ON public.game_logs(table_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_user ON public.game_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_created ON public.game_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can view game logs" ON public.game_logs;
DROP POLICY IF EXISTS "Users can insert game logs" ON public.game_logs;

-- ============================================
-- TABLE_PLAYERS POLICIES (FIXED - Owner can see even if empty)
-- ============================================

-- View: Owner OR any player in the table can see all players
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        -- Owner can always see (even if table is empty)
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        ) OR
        -- OR user is a player in this table
        user_id = auth.uid() OR
        table_id IN (
            SELECT table_id 
            FROM public.table_players 
            WHERE user_id = auth.uid()
        )
    );

-- Insert: User can add themselves OR owner can add
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

-- Update: User can update themselves OR owner can update
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
-- GAME_LOGS POLICIES
-- ============================================

-- View: Owner OR any player can see logs
CREATE POLICY "Users can view game logs" ON public.game_logs
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
CREATE POLICY "Users can insert game logs" ON public.game_logs
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
-- VERIFY POLICIES
-- ============================================
SELECT 
    'Policies created' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('table_players', 'game_logs');


