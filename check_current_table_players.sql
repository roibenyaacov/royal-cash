-- Check current table players for NULL user_ids
SELECT 
    tp.id,
    tp.user_id,
    tp.table_id,
    p.username,
    t.name as table_name,
    tp.rebuys,
    tp.cash_out,
    tp.net_profit
FROM table_players tp
LEFT JOIN profiles p ON tp.user_id = p.id
LEFT JOIN tables t ON tp.table_id = t.id
WHERE t.name = 'יאללה סוף סוף אינשאללה'
   OR t.name LIKE '%בדיקת%'
   OR t.created_at > NOW() - INTERVAL '1 day'
ORDER BY t.created_at DESC, p.username;




