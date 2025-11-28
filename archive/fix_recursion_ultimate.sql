-- ============================================
-- FIX INFINITE RECURSION - ULTIMATE SOLUTION
-- ============================================
-- This uses SECURITY DEFINER functions to break recursion
-- ============================================

-- Step 1: Create game_logs table if needed
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
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'table_players') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.table_players', r.policyname);
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'game_logs') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.game_logs', r.policyname);
    END LOOP;
END $$;

-- Step 3: Create SECURITY DEFINER functions (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_table_owner(table_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tables 
        WHERE id = table_uuid 
        AND owner_id = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_table_player(table_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.table_players
        WHERE table_id = table_uuid
        AND user_id = auth.uid()
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_table_owner(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_table_player(UUID) TO authenticated, anon;

-- Step 4: Create SIMPLE policies using functions (NO RECURSION!)
-- TABLE_PLAYERS SELECT: Owner OR player can see
CREATE POLICY "tp_select_via_functions" ON public.table_players
    FOR SELECT
    USING (
        public.is_table_owner(table_id) 
        OR 
        user_id = auth.uid()
        OR
        public.is_table_player(table_id)
    );

-- TABLE_PLAYERS INSERT: User can add themselves OR owner can add
CREATE POLICY "tp_insert_via_functions" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR
        public.is_table_owner(table_id)
    );

-- TABLE_PLAYERS UPDATE: User can update themselves OR owner can update
CREATE POLICY "tp_update_via_functions" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR
        public.is_table_owner(table_id)
    )
    WITH CHECK (
        user_id = auth.uid()
        OR
        public.is_table_owner(table_id)
    );

-- Step 5: Create policies for game_logs using functions
CREATE POLICY "gl_select_via_functions" ON public.game_logs
    FOR SELECT
    USING (
        public.is_table_owner(table_id)
        OR
        public.is_table_player(table_id)
    );

CREATE POLICY "gl_insert_via_functions" ON public.game_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            public.is_table_owner(table_id)
            OR
            public.is_table_player(table_id)
        )
    );

-- Step 6: Verify
SELECT 
    'Policies created successfully!' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('table_players', 'game_logs');

SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('table_players', 'game_logs')
ORDER BY tablename, policyname;


