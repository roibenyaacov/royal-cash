-- Check table_players with all details
SELECT 
    tp.id,
    p.username,
    t.name as table_name,
    t.buy_in,
    tp.rebuys,
    tp.cash_out,
    tp.net_profit,
    tp.food_credit,
    tp.food_debt,
    -- Calculate what net_profit SHOULD be
    (tp.cash_out - (tp.rebuys * t.buy_in) + (COALESCE(tp.food_credit, 0) - COALESCE(tp.food_debt, 0))) as calculated_net
FROM table_players tp
LEFT JOIN profiles p ON tp.user_id = p.id
LEFT JOIN tables t ON tp.table_id = t.id
WHERE t.name = 'יאללה סוף סוף אינשאללה'
ORDER BY p.username;




