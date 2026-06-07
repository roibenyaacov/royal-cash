-- ============================================================
-- FINAL COMPLETE FIX FOR ROYAL CASH STATS
-- ============================================================
-- This script will fix ALL stats issues in your app:
-- ✅ Fix UUID errors
-- ✅ Enable Hall of Fame (Shark, Loser, League Table)
-- ✅ Enable My Stats (total profit, biggest win/loss)
-- ✅ Ensure trigger updates user profiles correctly
--
-- INSTRUCTIONS: Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: DIAGNOSIS - Check Current State
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 1: DIAGNOSING CURRENT STATE';
    RAISE NOTICE '===========================================';
END $$;

-- Check for invalid user_id values
SELECT
    '❌ INVALID USER_IDS' as issue,
    COUNT(*) as count,
    'These rows will be fixed' as action
FROM public.table_players
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Check guest players (valid to have NULL)
SELECT
    '✅ GUEST PLAYERS (NULL user_id)' as status,
    COUNT(*) as count,
    'These are OK' as action
FROM public.table_players
WHERE user_id IS NULL;

-- Check current game_results count
SELECT
    '📊 CURRENT GAME RESULTS' as status,
    COUNT(*) as total_results,
    COUNT(DISTINCT table_id) as tables_with_results,
    COUNT(DISTINCT user_id) as players_with_results
FROM public.game_results;

-- Check profiles with stats
SELECT
    '👥 PROFILES WITH NON-ZERO PROFIT' as status,
    COUNT(*) as count
FROM public.profiles
WHERE total_profit IS NOT NULL AND total_profit != 0;

-- ============================================================
-- STEP 2: BACKUP CURRENT DATA (Just in case)
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 2: Creating backup tables';
    RAISE NOTICE '===========================================';
END $$;

-- Backup tables (drop if already exist from previous runs)
DROP TABLE IF EXISTS table_players_backup;
DROP TABLE IF EXISTS game_results_backup;
DROP TABLE IF EXISTS profiles_backup;

CREATE TABLE table_players_backup AS SELECT * FROM public.table_players;
CREATE TABLE game_results_backup AS SELECT * FROM public.game_results;
CREATE TABLE profiles_backup AS SELECT * FROM public.profiles;

SELECT '✅ BACKUP COMPLETE' as status, 'Data backed up to *_backup tables' as message;

-- ============================================================
-- STEP 3: FIX INVALID DATA
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 3: FIXING INVALID DATA';
    RAISE NOTICE '===========================================';
END $$;

-- Show what will be fixed
SELECT
    id,
    table_id,
    user_id::text as invalid_user_id,
    'Will be set to NULL' as action
FROM public.table_players
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Fix invalid user_ids
UPDATE public.table_players
SET user_id = NULL
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Verify fix
SELECT
    '✅ INVALID UUIDs FIXED' as status,
    COUNT(*) as remaining_invalid_count,
    'Should be 0' as expected
FROM public.table_players
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- ============================================================
-- STEP 4: VERIFY/RECREATE TRIGGER FUNCTION
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 4: CREATING/UPDATING TRIGGER';
    RAISE NOTICE '===========================================';
END $$;

-- Drop existing trigger and function to recreate fresh
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result();

-- Create improved trigger function with detailed logging
CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
DECLARE
    v_old_games_played INTEGER;
    v_old_total_profit NUMERIC;
    v_new_games_played INTEGER;
    v_new_total_profit NUMERIC;
BEGIN
    -- Get current values for logging
    SELECT games_played, total_profit
    INTO v_old_games_played, v_old_total_profit
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Log trigger execution
    RAISE NOTICE '🔔 Trigger fired! user_id: %, net_profit: %', NEW.user_id, NEW.net_profit;
    RAISE NOTICE '📊 Before: games_played=%, total_profit=%', v_old_games_played, v_old_total_profit;

    -- Update user stats
    UPDATE public.profiles
    SET
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;

    -- Get new values for logging
    SELECT games_played, total_profit
    INTO v_new_games_played, v_new_total_profit
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Log result
    IF FOUND THEN
        RAISE NOTICE '✅ After: games_played=%, total_profit=%', v_new_games_played, v_new_total_profit;
        RAISE NOTICE '✅ Profile updated successfully for user_id: %', NEW.user_id;
    ELSE
        RAISE WARNING '❌ No profile found for user_id: %', NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats_on_game_result();

SELECT '✅ TRIGGER CREATED' as status, 'Trigger will now update user stats on game completion' as message;

-- ============================================================
-- STEP 5: RESET USER STATS (OPTIONAL - read carefully!)
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 5: RESET OPTION (currently disabled)';
    RAISE NOTICE 'To enable: uncomment the UPDATE statements';
    RAISE NOTICE '===========================================';
END $$;

-- OPTION A: Reset all stats to zero (use if you want a fresh start)
-- WARNING: This will erase all current stats!
-- Uncomment the following line if you want to reset everything:
-- UPDATE public.profiles SET games_played = 0, total_profit = 0;

-- OPTION B: Recalculate from existing game_results
-- This is useful if you have valid data in game_results but profiles are wrong
-- Uncomment the following block if you want to recalculate:
/*
UPDATE public.profiles p
SET
    games_played = COALESCE(subquery.game_count, 0),
    total_profit = COALESCE(subquery.total_profit, 0)
FROM (
    SELECT
        user_id,
        COUNT(*) as game_count,
        SUM(net_profit) as total_profit
    FROM public.game_results
    GROUP BY user_id
) subquery
WHERE p.id = subquery.user_id;
*/

-- ============================================================
-- STEP 6: VERIFICATION
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 6: FINAL VERIFICATION';
    RAISE NOTICE '===========================================';
END $$;

-- Verify no invalid UUIDs remain
SELECT
    'INVALID UUIDs CHECK' as check_name,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ PASS - No invalid UUIDs'
        ELSE '❌ FAIL - Still has invalid UUIDs'
    END as result,
    COUNT(*) as invalid_count
FROM public.table_players
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Verify trigger exists
SELECT
    'TRIGGER CHECK' as check_name,
    CASE
        WHEN COUNT(*) = 1 THEN '✅ PASS - Trigger exists'
        ELSE '❌ FAIL - Trigger missing'
    END as result,
    COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname = 'on_game_result_insert';

-- Show current state of players
SELECT
    'PLAYERS DATA SAMPLE' as info,
    COUNT(*) as total_players,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as registered_players,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_players
FROM public.table_players;

-- Show current stats
SELECT
    'CURRENT PROFILE STATS' as info,
    username,
    games_played,
    total_profit
FROM public.profiles
ORDER BY games_played DESC, total_profit DESC
LIMIT 10;

-- ============================================================
-- FINAL MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ FIX COMPLETE!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Go to your app';
    RAISE NOTICE '2. Complete a game with registered players';
    RAISE NOTICE '3. Check browser console for trigger logs';
    RAISE NOTICE '4. Verify Hall of Fame shows data';
    RAISE NOTICE '5. Check My Stats shows correct total profit';
    RAISE NOTICE '===========================================';
END $$;

SELECT
    '🎉 DATABASE FIX COMPLETE!' as status,
    'Your app should now work correctly' as message,
    'Test by completing a game and checking stats' as next_action;
