-- ============================================
-- TASK 3: USER STATS AUTOMATION & HISTORY
-- ============================================

-- 1. Add Stats Columns to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;

-- 2. Create Function to Update Player Stats on Game Completion
CREATE OR REPLACE FUNCTION public.update_player_stats_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    player_record RECORD;
BEGIN
    -- Only run if status changed to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Loop through all players in this table
        FOR player_record IN 
            SELECT user_id, net_profit 
            FROM public.table_players 
            WHERE table_id = NEW.id
        LOOP
            -- Update the user's profile
            UPDATE public.profiles
            SET 
                games_played = games_played + 1,
                total_profit = total_profit + COALESCE(player_record.net_profit, 0)
            WHERE id = player_record.user_id;
        END LOOP;
        
    END IF;
    return NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on Tables
DROP TRIGGER IF EXISTS on_game_completed ON public.tables;
CREATE TRIGGER on_game_completed
    AFTER UPDATE OF status ON public.tables
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_player_stats_on_completion();

-- 4. Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('total_profit', 'games_played');

