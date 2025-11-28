-- ============================================
-- FIX RLS & CREATE GAME LOGS TABLE
-- ============================================
-- This fixes the RLS issue and creates game_logs table
-- ============================================

-- 1. CREATE GAME_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.game_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'rebuy_add', 'rebuy_remove', 'player_added', 'food_added', etc.
    action_description TEXT NOT NULL, -- 'רועי הוסיף 200', 'דני הוריד 50'
    old_value NUMERIC,
    new_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_logs_table ON public.game_logs(table_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_user ON public.game_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_created ON public.game_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FIX RLS POLICIES FOR TABLE_PLAYERS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;

-- NEW POLICY: Anyone in the same table can view all players in that table
-- IMPORTANT: Owner can always see players, even if table is empty
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        -- User is a player in this table OR user owns the table
        user_id = auth.uid() OR
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

-- Users can insert themselves OR owner can add players
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

-- Users can update themselves OR owner can update
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
-- RLS POLICIES FOR GAME_LOGS
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view game logs" ON public.game_logs;
DROP POLICY IF EXISTS "Users can insert game logs" ON public.game_logs;

-- Anyone in the same table can view logs
CREATE POLICY "Users can view game logs" ON public.game_logs
    FOR SELECT
    USING (
        -- User is a player in this table OR user owns the table
        table_id IN (
            SELECT table_id 
            FROM public.table_players 
            WHERE user_id = auth.uid()
        ) OR
        table_id IN (
            SELECT id 
            FROM public.tables 
            WHERE owner_id = auth.uid()
        )
    );

-- Users can insert logs for tables they're in
CREATE POLICY "Users can insert game logs" ON public.game_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        (
            table_id IN (
                SELECT table_id 
                FROM public.table_players 
                WHERE user_id = auth.uid()
            ) OR
            table_id IN (
                SELECT id 
                FROM public.tables 
                WHERE owner_id = auth.uid()
            )
        )
    );

-- ============================================
-- VERIFY
-- ============================================
SELECT 
    'game_logs table created' as status,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_logs'
    ) as table_exists;

SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('table_players', 'game_logs')
ORDER BY tablename, policyname;

