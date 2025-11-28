-- ============================================
-- ULTIMATE FIX: UPDATE USER STATS CORRECTLY
-- ============================================

-- First, let's check current profile structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('total_profit', 'games_played');

-- Drop and recreate the trigger function with better logic
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result() CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the update for debugging
    RAISE NOTICE 'Updating stats for user % with net_profit %', NEW.user_id, NEW.net_profit;
    
    -- Update the user's profile with this game's data
    UPDATE public.profiles
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;
    
    -- Verify the update happened
    IF NOT FOUND THEN
        RAISE WARNING 'Profile not found for user %', NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats_on_game_result();

-- Test query: Check if profiles have the columns
SELECT id, username, total_profit, games_played 
FROM public.profiles 
LIMIT 3;

-- Verify trigger exists
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_game_result_insert';

-- Success message (as a query result)
SELECT 'Trigger updated successfully!' as status;



