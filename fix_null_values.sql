-- Fix NULL values in profiles table
UPDATE profiles 
SET 
    total_profit = 0 
WHERE total_profit IS NULL;

UPDATE profiles 
SET 
    games_played = 0 
WHERE games_played IS NULL;

-- Verify the fix
SELECT 
    username,
    total_profit,
    games_played
FROM profiles;




