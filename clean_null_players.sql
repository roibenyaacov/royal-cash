-- Find and delete table_players with NULL user_id
-- These are "ghost players" that shouldn't exist

-- First, see what we're about to delete
SELECT 
    tp.id,
    tp.table_id,
    tp.user_id,
    t.name as table_name,
    t.created_at as table_created
FROM table_players tp
LEFT JOIN tables t ON tp.table_id = t.id
WHERE tp.user_id IS NULL
ORDER BY t.created_at DESC;

-- If you see rows above, run this to delete them:
-- DELETE FROM table_players WHERE user_id IS NULL;

-- Verify they're gone:
SELECT COUNT(*) as remaining_null_players
FROM table_players
WHERE user_id IS NULL;




