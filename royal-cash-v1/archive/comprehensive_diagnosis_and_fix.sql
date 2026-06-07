-- ============================================================
-- COMPREHENSIVE DIAGNOSIS AND FIX FOR ROYAL CASH GAME DATA
-- ============================================================

-- ============================================================
-- PART 1: DIAGNOSE CURRENT STATE
-- ============================================================

-- 1.1: Check for invalid user_id values in table_players
SELECT
    'INVALID USER_IDS IN TABLE_PLAYERS' as diagnosis,
    COUNT(*) as count,
    string_agg(DISTINCT user_id::text, ', ') as sample_values
FROM public.table_players
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 1.2: Check how many players have NULL user_id (valid for guests)
SELECT
    'NULL USER_IDS (GUESTS)' as diagnosis,
    COUNT(*) as count
FROM public.table_players
WHERE user_id IS NULL;

-- 1.3: Check if game_results has any data
SELECT
    'GAME RESULTS COUNT' as diagnosis,
    COUNT(*) as total_results,
    COUNT(DISTINCT table_id) as tables_with_results
FROM public.game_results;

-- 1.4: Check if profiles have total_profit data
SELECT
    'PROFILES WITH NON-ZERO PROFIT' as diagnosis,
    COUNT(*) as count
FROM public.profiles
WHERE total_profit != 0 OR total_profit IS NOT NULL;

-- 1.5: Check trigger exists
SELECT
    'TRIGGER EXISTS' as diagnosis,
    COUNT(*) as count
FROM pg_trigger
WHERE tgname = 'on_game_result_insert';

-- 1.6: Check trigger function exists
SELECT
    'TRIGGER FUNCTION EXISTS' as diagnosis,
    COUNT(*) as count
FROM pg_proc
WHERE proname = 'update_user_stats_on_game_result';

-- ============================================================
-- PART 2: FIX INVALID DATA
-- ============================================================

-- 2.1: Fix string 'null' to proper NULL
UPDATE public.table_players
SET user_id = NULL
WHERE user_id::text = 'null'
   OR user_id::text = 'undefined'
   OR user_id::text = '';

-- 2.2: Show what was fixed
SELECT
    'ROWS FIXED' as status,
    COUNT(*) as count
FROM public.table_players
WHERE user_id IS NULL;

-- ============================================================
-- PART 3: VERIFY/CREATE TRIGGER
-- ============================================================

-- 3.1: Drop existing trigger if it exists (to recreate it)
DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;

-- 3.2: Drop existing function if it exists
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result();

-- 3.3: Create the trigger function
CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the trigger execution for debugging
    RAISE NOTICE 'Trigger fired for user_id: %, net_profit: %', NEW.user_id, NEW.net_profit;

    -- Update user stats
    UPDATE public.profiles
    SET
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;

    -- Log the update result
    IF FOUND THEN
        RAISE NOTICE 'Profile updated successfully for user_id: %', NEW.user_id;
    ELSE
        RAISE WARNING 'No profile found for user_id: %', NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.4: Create the trigger
CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats_on_game_result();

-- 3.5: Verify trigger was created
SELECT
    'TRIGGER CREATED' as status,
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_game_result_insert';

-- ============================================================
-- PART 4: TEST DATA INTEGRITY
-- ============================================================

-- 4.1: Show sample of table_players with their user_ids
SELECT
    tp.id,
    tp.table_id,
    tp.user_id,
    tp.rebuys,
    tp.cash_out,
    tp.net_profit,
    p.username,
    CASE
        WHEN tp.user_id IS NULL THEN 'Guest (OK)'
        WHEN tp.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Valid UUID'
        ELSE 'INVALID UUID'
    END as user_id_status
FROM public.table_players tp
LEFT JOIN public.profiles p ON tp.user_id = p.id
ORDER BY tp.table_id DESC, tp.id DESC
LIMIT 20;

-- 4.2: Show current profile stats
SELECT
    id,
    username,
    total_profit,
    games_played,
    created_at
FROM public.profiles
ORDER BY username;

-- 4.3: Show game_results summary
SELECT
    table_id,
    COUNT(*) as results_count,
    SUM(net_profit) as total_net_profit,
    MIN(game_date) as earliest_game,
    MAX(game_date) as latest_game
FROM public.game_results
GROUP BY table_id
ORDER BY table_id DESC;

-- ============================================================
-- PART 5: OPTIONAL - RECALCULATE ALL USER STATS FROM HISTORY
-- ============================================================
-- Only run this if you want to recalculate all user stats based on game_results

-- 5.1: Reset all user stats to zero (CAUTION!)
-- Uncomment to use:
-- UPDATE public.profiles
-- SET games_played = 0, total_profit = 0;

-- 5.2: Recalculate from game_results (CAUTION!)
-- Uncomment to use:
-- UPDATE public.profiles p
-- SET
--     games_played = subquery.game_count,
--     total_profit = subquery.total_profit
-- FROM (
--     SELECT
--         user_id,
--         COUNT(*) as game_count,
--         SUM(net_profit) as total_profit
--     FROM public.game_results
--     GROUP BY user_id
-- ) subquery
-- WHERE p.id = subquery.user_id;

-- ============================================================
-- FINAL VERIFICATION
-- ============================================================
SELECT
    '=== FIX COMPLETE ===' as status,
    'Run a test game settlement and check:' as next_step,
    '1. Check browser console for any UUID errors' as step_1,
    '2. Verify game_results table gets new rows' as step_2,
    '3. Check profiles table for updated total_profit' as step_3,
    '4. Open Hall of Fame to see if data appears' as step_4;
