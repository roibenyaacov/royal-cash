-- ============================================
-- ULTIMATE FIX: CREATE/UPDATE PROFILES AND TRIGGER
-- ============================================

-- Step 1: Add columns to profiles if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;

-- Step 2: Create missing profiles for all users
INSERT INTO public.profiles (id, email, username, total_profit, games_played)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'username', 'Player'),
    0,
    0
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;

-- Step 3: Update existing profiles that are missing the new columns (set to 0 if null)
UPDATE public.profiles
SET 
    total_profit = COALESCE(total_profit, 0),
    games_played = COALESCE(games_played, 0)
WHERE total_profit IS NULL OR games_played IS NULL;

-- Step 4: Create the trigger function
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result();

CREATE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's profile stats
    UPDATE public.profiles
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the trigger
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats_on_game_result();

-- Step 6: Verify your profile exists now
SELECT id, username, email, total_profit, games_played 
FROM public.profiles 
WHERE id = auth.uid();


