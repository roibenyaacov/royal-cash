-- ============================================
-- TASK: GLOBAL USER STATS & HISTORY LOGIC
-- ============================================

-- 1. Add stats columns to public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;

-- 2. Create a Function to update player stats when a game completes
CREATE OR REPLACE FUNCTION public.update_player_stats_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    player_record RECORD;
BEGIN
    -- Only run if status changed to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Iterate through all players in this table
        FOR player_record IN 
            SELECT user_id, net_profit 
            FROM public.table_players 
            WHERE table_id = NEW.id
        LOOP
            -- Update the user's profile stats
            UPDATE public.profiles
            SET 
                games_played = games_played + 1,
                total_profit = total_profit + COALESCE(player_record.net_profit, 0)
            WHERE id = player_record.user_id;
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger on the 'tables' table
DROP TRIGGER IF EXISTS on_game_completion ON public.tables;
CREATE TRIGGER on_game_completion
    AFTER UPDATE OF status ON public.tables
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_player_stats_on_completion();

-- 4. RETROACTIVE FIX (Optional but recommended)
-- Recalculate stats for all users based on existing game_results or completed tables
-- Use this query manually if you want to sync everything from scratch:
/*
UPDATE public.profiles p
SET 
    games_played = (
        SELECT COUNT(*) 
        FROM public.table_players tp 
        JOIN public.tables t ON tp.table_id = t.id 
        WHERE tp.user_id = p.id AND t.status = 'completed'
    ),
    total_profit = (
        SELECT COALESCE(SUM(tp.net_profit), 0)
        FROM public.table_players tp 
        JOIN public.tables t ON tp.table_id = t.id 
        WHERE tp.user_id = p.id AND t.status = 'completed'
    );
*/


