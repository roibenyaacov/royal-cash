ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

UPDATE public.profiles SET total_profit = 0 WHERE total_profit IS NULL;
UPDATE public.profiles SET games_played = 0 WHERE games_played IS NULL;

ALTER TABLE public.table_players ADD COLUMN IF NOT EXISTS cash_out NUMERIC DEFAULT 0;
ALTER TABLE public.table_players ADD COLUMN IF NOT EXISTS net_profit NUMERIC DEFAULT 0;

ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

DROP TRIGGER IF EXISTS on_game_result_insert ON public.game_results;
DROP FUNCTION IF EXISTS public.update_user_stats_on_game_result();

CREATE OR REPLACE FUNCTION public.update_user_stats_on_game_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
        RETURN NEW;
    END IF;
    
    UPDATE public.profiles
    SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_profit = COALESCE(total_profit, 0) + COALESCE(NEW.net_profit, 0)
    WHERE id = NEW.user_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

CREATE TRIGGER on_game_result_insert
    AFTER INSERT ON public.game_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_stats_on_game_result();

SELECT 'Fix Complete - All tables updated and trigger created' as status;




