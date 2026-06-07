-- ============================================
-- FIX RECURSION USING SECURITY DEFINER FUNCTION
-- ============================================
-- This uses a function to avoid recursion completely
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can insert table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can update table players" ON public.table_players;
DROP POLICY IF EXISTS "Users can view accessible tables" ON public.tables;
DROP POLICY IF EXISTS "Users can view tables they play in" ON public.tables;
DROP POLICY IF EXISTS "Users can create tables" ON public.tables;
DROP POLICY IF EXISTS "Owners can update tables" ON public.tables;

-- Create helper function to check table access (avoids recursion)
CREATE OR REPLACE FUNCTION public.user_can_access_table(table_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_can_access_table(UUID) TO authenticated, anon;

-- ============================================
-- NEW POLICIES USING THE FUNCTION
-- ============================================

-- TABLES: View
CREATE POLICY "Users can view accessible tables" ON public.tables
    FOR SELECT
    USING (public.user_can_access_table(id));

-- TABLES: Create
CREATE POLICY "Users can create tables" ON public.tables
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- TABLES: Update
CREATE POLICY "Owners can update tables" ON public.tables
    FOR UPDATE
    USING (owner_id = auth.uid());

-- TABLE_PLAYERS: View
CREATE POLICY "Users can view table players" ON public.table_players
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.user_can_access_table(table_id)
    );

-- TABLE_PLAYERS: Insert
CREATE POLICY "Users can insert table players" ON public.table_players
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.tables WHERE id = table_players.table_id AND owner_id = auth.uid())
    );

-- TABLE_PLAYERS: Update
CREATE POLICY "Users can update table players" ON public.table_players
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.tables WHERE id = table_players.table_id AND owner_id = auth.uid())
    );

-- Verify
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('tables', 'table_players')
ORDER BY tablename, policyname;

