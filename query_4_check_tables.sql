SELECT 
    t.id,
    t.name,
    t.buy_in,
    t.status,
    t.created_at,
    p.username as owner_name
FROM tables t
LEFT JOIN profiles p ON t.owner_id = p.id
ORDER BY t.created_at DESC;




