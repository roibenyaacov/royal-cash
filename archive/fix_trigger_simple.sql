-- ============================================
-- SIMPLE FIX: UPDATE USER STATS ON GAME RESULT
-- ============================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result();

-- Create simple trigger function
CREATE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's profile stats
    UPDATE public.profiles
    SET 
        games_played = games_played + 1,
        total_profit = total_profit + NEW.net_profit
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats_on_game_result();

-- Verify it was created
SELECT 'Trigger created successfully!' as result;


