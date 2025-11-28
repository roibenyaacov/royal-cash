SELECT 
    tp.id as table_player_id,
    tp.table_id,
    tp.user_id,
    tp.rebuys,
    tp.cash_out,
    tp.net_profit,
    t.name as table_name,
    p.username
FROM table_players tp
LEFT JOIN tables t ON tp.table_id = t.id
LEFT JOIN profiles p ON tp.user_id = p.id
ORDER BY t.created_at DESC;




