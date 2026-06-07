-- ========================================
-- FIX INVALID USER_ID VALUES IN DATABASE
-- ========================================
-- This script fixes the "invalid input syntax for type uuid: 'null'" error
-- by cleaning up invalid user_id values in table_players

-- STEP 1: Check current state of invalid data
-- Run this first to see what we're dealing with
SELECT
    id,
    table_id,
    user_id,
    rebuys,
    cash_out,
    net_profit
FROM public.table_players
WHERE
    user_id IS NULL
    OR user_id::text = 'null'  -- String "null"
    OR user_id::text = ''       -- Empty string
    OR NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- STEP 2: Fix invalid user_id values
-- Option A: Set string 'null' to proper NULL
UPDATE public.table_players
SET user_id = NULL
WHERE user_id::text = 'null';

-- Option B: Delete rows with invalid user_ids (if these are test/corrupt data)
-- Uncomment the following line if you want to delete these rows instead:
-- DELETE FROM public.table_players WHERE user_id IS NULL;

-- STEP 3: Verify the fix
-- This should return 0 rows after the fix
SELECT
    COUNT(*) as invalid_count
FROM public.table_players
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- STEP 4: Check game_results table for any similar issues
SELECT
    COUNT(*) as invalid_game_results
FROM public.game_results
WHERE
    user_id IS NOT NULL
    AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- STEP 5: Optionally, remove invalid game_results if any exist
-- DELETE FROM public.game_results
-- WHERE user_id IS NOT NULL
-- AND NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- ========================================
-- NOTES:
-- ========================================
-- 1. The JavaScript code already has validation to prevent future invalid data
-- 2. Players with NULL user_id are OK (they represent guests)
-- 3. Only string "null" or malformed UUIDs need to be fixed
-- 4. After running this, try settling a game again and check if Hall of Fame populates
