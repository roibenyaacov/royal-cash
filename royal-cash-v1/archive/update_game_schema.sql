-- ============================================
-- TASK 2: GAME PERSISTENCE & SCHEMA UPDATES
-- ============================================

-- 1. Update 'tables' table with status
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed'));

-- 2. Update 'table_players' with financial results
ALTER TABLE public.table_players 
ADD COLUMN IF NOT EXISTS cash_out NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_profit NUMERIC DEFAULT 0;

-- 3. Index for faster history queries
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_owner ON public.tables(owner_id);
CREATE INDEX IF NOT EXISTS idx_table_players_user ON public.table_players(user_id);

-- 4. Verify columns
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('tables', 'table_players')
  AND column_name IN ('status', 'cash_out', 'net_profit')
ORDER BY table_name, column_name;


