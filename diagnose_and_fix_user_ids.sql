-- Diagnose and Fix User ID Issues in Royal Cash App
-- Run this in Supabase SQL Editor

-- =====================================================
-- PART 1: DIAGNOSTIC QUERIES
-- =====================================================

-- 1. Check for table_players with null user_id
SELECT 
    tp.id as table_player_id,
    tp.table_id,
    tp.user_id,
    t.name as table_name,
    tp.rebuys,
    tp.cash_out,
    tp.net_profit
FROM table_players tp
JOIN tables t ON tp.table_id = t.id
WHERE tp.user_id IS NULL;

-- 2. Check for invalid UUIDs (not in auth.users)
SELECT 
    tp.id as table_player_id,
    tp.user_id,
    tp.table_id,
    t.name as table_name
FROM table_players tp
JOIN tables t ON tp.table_id = t.id
WHERE tp.user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = tp.user_id
  );

-- 3. Check game_results table
SELECT 
    gr.id,
    gr.table_id,
    gr.user_id,
    gr.net_profit,
    gr.game_date,
    p.username
FROM game_results gr
LEFT JOIN profiles p ON gr.user_id = p.id
ORDER BY gr.game_date DESC
LIMIT 20;

-- 4. Check profiles stats
SELECT 
    id,
    username,
    phone_number,
    total_profit,
    games_played,
    created_at
FROM profiles
WHERE games_played > 0 OR total_profit != 0
ORDER BY games_played DESC;

-- =====================================================
-- PART 2: EXPLANATION
-- =====================================================

/*
EXPECTED RESULTS:

Query 1 (null user_ids):
- Should show ZERO rows
- If you see rows here, these are "guest players" that should NOT be in table_players
- Only registered users should be added to tables

Query 2 (invalid UUIDs):
- Should show ZERO rows
- If you see rows, these are orphaned records with deleted users

Query 3 (game_results):
- Should show recent game completions
- Every row should have a valid user_id that matches a profile

Query 4 (profiles stats):
- Should show users with games_played > 0
- total_profit should reflect their actual wins/losses
- If total_profit is 0 but games_played > 0, the trigger is NOT working
*/

-- =====================================================
-- PART 3: CLEANUP (Only run if needed)
-- =====================================================

-- OPTION A: Delete table_players with null user_id (if any exist)
-- Uncomment the next line to execute:
-- DELETE FROM table_players WHERE user_id IS NULL;

-- OPTION B: Delete orphaned game_results (if any exist)
-- Uncomment the next line to execute:
-- DELETE FROM game_results WHERE user_id NOT IN (SELECT id FROM auth.users);

-- =====================================================
-- PART 4: VERIFY TRIGGER IS WORKING
-- =====================================================

-- Check that the trigger exists
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_game_result_insert';

-- Check the trigger function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_user_stats_on_game_result';

-- =====================================================
-- PART 5: MANUAL TEST (Optional)
-- =====================================================

/*
To manually test the trigger:

1. Find your user_id:
   SELECT id, username FROM profiles WHERE username = 'YOUR_USERNAME';

2. Find a table_id:
   SELECT id, name FROM tables WHERE owner_id = (SELECT id FROM profiles WHERE username = 'YOUR_USERNAME') LIMIT 1;

3. Check current stats:
   SELECT username, total_profit, games_played FROM profiles WHERE username = 'YOUR_USERNAME';

4. Insert a test game result:
   INSERT INTO game_results (table_id, user_id, net_profit, game_date)
   VALUES (
       'YOUR_TABLE_ID_HERE',
       'YOUR_USER_ID_HERE',
       100,
       NOW()
   );

5. Check updated stats:
   SELECT username, total_profit, games_played FROM profiles WHERE username = 'YOUR_USERNAME';
   -- total_profit should have increased by 100
   -- games_played should have increased by 1

6. Clean up test data:
   DELETE FROM game_results WHERE user_id = 'YOUR_USER_ID_HERE' AND net_profit = 100;
*/




