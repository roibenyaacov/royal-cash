-- ============================================
-- COMPLETE FIX - NO RECURSION
-- ============================================

-- 1. Delete old players table
DROP TABLE IF EXISTS public.players CASCADE;

-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can view accessible tables" ON public.tables;
DROP POLICY IF EXISTS "Users can view tables they play in" ON public.tables;
DROP POLICY IF EXISTS "Users can create tables" ON public.tables;
DROP POLICY IF EXISTS "Owners can update tables" ON public.tables;

-- 3. Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE HELPER FUNCTION (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_table_owner(table_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.tables 
        WHERE id = table_uuid 
        AND owner_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_table_player(table_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.table_players 
        WHERE table_id = table_uuid 
        AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_table_owner(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_table_player(UUID) TO authenticated, anon;

-- ============================================
-- POLICIES USING FUNCTIONS (NO RECURSION)
-- ============================================

-- TABLES: View
CREATE POLICY "Users can view accessible tables" ON public.tables
    FOR SELECT
    USING (
        owner_id = auth.uid() OR
        public.is_table_player(id)
    );

-- TABLES: Insert
CREATE POLICY "Users can create tables" ON public.tables
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- TABLES: Update
CREATE POLICY "Owners can update tables" ON public.tables
    FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- TABLE_PLAYERS: View
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.is_table_owner(table_id)
    );

-- TABLE_PLAYERS: Insert
CREATE POLICY "Users can insert table players" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        public.is_table_owner(table_id)
    );

-- TABLE_PLAYERS: Update
CREATE POLICY "Users can update table players" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        public.is_table_owner(table_id)
    )
    WITH CHECK (
        user_id = auth.uid() OR
        public.is_table_owner(table_id)
    );

-- ============================================
-- VERIFY
-- ============================================
SELECT 
    'Policies created successfully' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('tables', 'table_players');

