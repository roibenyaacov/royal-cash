-- ============================================
-- FIX SECURITY WARNINGS: SET SEARCH_PATH
-- ============================================
-- This script updates functions to explicitly set search_path = public
-- This prevents privilege escalation attacks via search_path manipulation
-- ============================================

-- 1. Fix update_player_stats_on_completion
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix update_user_stats_on_game_result
CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's profile with this game's data
    -- Use COALESCE to handle cases where current stats are NULL
    UPDATE public.profiles
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be called from the app with username and phone
    -- For now, just create a basic profile
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'משתמש'),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Fix user_can_access_table
CREATE OR REPLACE FUNCTION public.user_can_access_table(table_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    -- Check if user owns the table
    IF EXISTS (SELECT 1 FROM public.tables WHERE id = table_uuid AND owner_id = auth.uid()) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is a player
    IF EXISTS (SELECT 1 FROM public.table_players WHERE table_id = table_uuid AND user_id = auth.uid()) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 5. Verify (Optional - just listing functions to confirm they exist)
SELECT proname, prosrc, proconfig 
FROM pg_proc 
WHERE proname IN ('update_player_stats_on_completion', 'update_user_stats_on_game_result', 'handle_new_user', 'user_can_access_table');
