SELECT 
    gr.id,
    gr.table_id,
    gr.user_id,
    gr.net_profit,
    gr.game_date,
    p.username,
    t.name as table_name
FROM game_results gr
LEFT JOIN profiles p ON gr.user_id = p.id
LEFT JOIN tables t ON gr.table_id = t.id
ORDER BY gr.game_date DESC
LIMIT 20;




