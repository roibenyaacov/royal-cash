-- =====================================================
-- ULTIMATE FIX for Royal Cash Stats System
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Ensure profiles table has required columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Step 2: Update existing profiles to have 0 instead of null
UPDATE public.profiles 
SET total_profit = 0 
WHERE total_profit IS NULL;

UPDATE public.profiles 
SET games_played = 0 
WHERE games_played IS NULL;

-- Step 3: Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result();

CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log the incoming data
    RAISE NOTICE 'Trigger fired for user_id: %, net_profit: %', NEW.user_id, NEW.net_profit;
    
    -- Validate user_id exists
    IF NEW.user_id IS NULL THEN
        RAISE NOTICE 'Skipping stats update - user_id is NULL';
        RETURN NEW;
    END IF;
    
    -- Check if user exists in profiles
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
        RAISE NOTICE 'Skipping stats update - user_id % not found in profiles', NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Update the user's stats
    UPDATE public.profiles
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;
    
    -- Log the update
    RAISE NOTICE 'Successfully updated stats for user_id: %', NEW.user_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors but don't fail the insert
        RAISE NOTICE 'Error updating user stats: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 4: Create the trigger
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats_on_game_result();

-- Step 5: Ensure table_players has required columns
ALTER TABLE public.table_players 
ADD COLUMN IF NOT EXISTS cash_out NUMERIC DEFAULT 0;

ALTER TABLE public.table_players 
ADD COLUMN IF NOT EXISTS net_profit NUMERIC DEFAULT 0;

-- Step 6: Clean up any invalid data (OPTIONAL - uncomment if needed)
-- Delete table_players with null user_id (should not exist)
-- DELETE FROM public.table_players WHERE user_id IS NULL;

-- Delete game_results with null user_id (should not exist)
-- DELETE FROM public.game_results WHERE user_id IS NULL;

-- Step 7: Recalculate stats for existing users (OPTIONAL - uncomment if needed)
-- This will fix any users whose stats are out of sync
/*
UPDATE public.profiles p
SET 
    total_profit = COALESCE((
        SELECT SUM(net_profit) 
        FROM game_results 
        WHERE user_id = p.id
    ), 0),
    games_played = COALESCE((
        SELECT COUNT(*) 
        FROM game_results 
        WHERE user_id = p.id
    ), 0);
*/

-- Step 8: Verify everything is set up correctly
SELECT 
    'Profiles Table' as check_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN total_profit IS NOT NULL THEN 1 END) as has_total_profit,
    COUNT(CASE WHEN games_played IS NOT NULL THEN 1 END) as has_games_played
FROM public.profiles
UNION ALL
SELECT 
    'Game Results' as check_type,
    COUNT(*) as total,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_valid_user_id,
    0 as extra
FROM public.game_results
UNION ALL
SELECT 
    'Trigger Status' as check_type,
    COUNT(*) as exists,
    0 as extra1,
    0 as extra2
FROM pg_trigger 
WHERE tgname = 'on_game_result_insert';

-- Done!
SELECT '✅ Ultimate Fix Complete!' as status;




