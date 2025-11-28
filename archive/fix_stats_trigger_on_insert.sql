-- ============================================
-- FIX: UPDATE USER STATS ON GAME RESULTS INSERT
-- ============================================
-- This trigger updates user profile stats whenever a new game result is inserted
-- This way, stats update even if the table stays 'active'

-- 1. Create function to update user stats when game result is inserted
CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's profile with this game's data
    -- Use COALESCE to handle cases where current stats are NULL
    UPDATE public.profiles
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_user_stats_on_game_result();

-- 3. Verify the trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_game_result_insert';


