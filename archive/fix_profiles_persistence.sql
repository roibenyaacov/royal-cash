-- ============================================
-- TASK 1: USER PROFILE PERSISTENCE & REPAIR
-- ============================================

-- 1. Ensure public.profiles has the correct columns
-- We use 'username' as Full Name based on existing app logic
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT; -- Adding this just in case, but we'll sync it with username

-- 2. RETROACTIVE FIX: Create profiles for existing users who are missing them
INSERT INTO public.profiles (id, email, username, full_name, phone_number)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'username', 'Player'), -- Fallback name
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'username', 'Player'),
    COALESCE(au.raw_user_meta_data->>'phone_number', '')
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;

-- 3. ROBUST AUTOMATION: Create a Trigger to handle new signups automatically
-- This ensures that even if the JS fails, the profile is created in the DB

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, full_name, phone_number)
    VALUES (
        new.id,
        new.email,
        -- Prioritize metadata sent from JS, fallback to 'New Player'
        COALESCE(new.raw_user_meta_data->>'username', 'New Player'),
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', 'New Player'),
        COALESCE(new.raw_user_meta_data->>'phone_number', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        phone_number = EXCLUDED.phone_number;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Verify
SELECT COUNT(*) as profiles_count FROM public.profiles;


