-- ============================================
-- FIX: INITIALIZE NULL STATS TO 0
-- ============================================
-- This script updates all existing profiles where stats are NULL
-- setting them to 0 so that calculations work correctly.

UPDATE public.profiles
SET 
    total_profit = COALESCE(total_profit, 0),
    games_played = COALESCE(games_played, 0)
WHERE 
    total_profit IS NULL OR 
    games_played IS NULL;

-- Verify the update
SELECT count(*) as null_stats_count 
FROM public.profiles 
WHERE total_profit IS NULL OR games_played IS NULL;
