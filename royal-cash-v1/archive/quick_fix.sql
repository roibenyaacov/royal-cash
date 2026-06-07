-- ============================================
-- QUICK FIX - Test Profile Insert
-- ============================================
-- This script helps debug the RLS issue
-- ============================================

-- First, let's make sure the policy allows inserts
-- Check current policies
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'INSERT';

-- If the policy doesn't exist or is wrong, recreate it:
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Also, let's make sure authenticated users can insert
-- This is a backup policy in case the first one doesn't work
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;

CREATE POLICY "Authenticated users can insert own profile" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Verify the policies
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'INSERT';

