-- Simple Diagnosis - Run each query ONE AT A TIME

-- QUERY 1: Check all users (profiles)
SELECT 
    id,
    username,
    phone_number,
    total_profit,
    games_played,
    created_at
FROM profiles
ORDER BY created_at DESC;




