-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================
-- This creates a trigger that automatically creates a profile
-- when a user signs up, bypassing RLS issues
-- ============================================

-- Function to create profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be called from the app with username and phone
    -- For now, just create a basic profile
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'משתמש'),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ALTERNATIVE: Update RLS to allow service role
-- ============================================
-- If the trigger doesn't work, we can also allow
-- the service role to insert profiles

-- Grant service role permission (if needed)
-- This is done automatically by Supabase, but we can verify

-- ============================================
-- IMPORTANT: Make sure the profiles table allows inserts
-- ============================================
-- The RLS policy should allow users to insert their own profile
-- Let's verify and recreate if needed:

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Also allow service role (for trigger)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.tables TO anon, authenticated;
GRANT ALL ON public.table_players TO anon, authenticated;
GRANT ALL ON public.game_results TO anon, authenticated;

