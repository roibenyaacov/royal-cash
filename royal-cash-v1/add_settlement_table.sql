-- ==============================================================================
-- Create settlement_results table for realtime settlement sharing
-- ==============================================================================
-- This table stores the settlement calculation results so all players
-- can see who owes whom in realtime.
-- ==============================================================================

-- Create settlement_results table
CREATE TABLE IF NOT EXISTS public.settlement_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    from_player_id UUID NOT NULL REFERENCES public.table_players(id) ON DELETE CASCADE,
    to_player_id UUID NOT NULL REFERENCES public.table_players(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT amount_positive CHECK (amount > 0)
);

-- Add status column to tables if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tables'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.tables
        ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.settlement_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settlement_results
-- Allow SELECT for anyone in the table
DROP POLICY IF EXISTS "Players can view settlement results" ON public.settlement_results;
CREATE POLICY "Players can view settlement results"
ON public.settlement_results
FOR SELECT
USING (
    table_id IN (
        SELECT table_id FROM public.table_players
        WHERE user_id = auth.uid()
    )
    OR
    table_id IN (
        SELECT id FROM public.tables
        WHERE owner_id = auth.uid()
    )
);

-- Allow INSERT for table owner only
DROP POLICY IF EXISTS "Table owner can insert settlement results" ON public.settlement_results;
CREATE POLICY "Table owner can insert settlement results"
ON public.settlement_results
FOR INSERT
WITH CHECK (
    table_id IN (
        SELECT id FROM public.tables
        WHERE owner_id = auth.uid()
    )
);

-- Allow DELETE for table owner only
DROP POLICY IF EXISTS "Table owner can delete settlement results" ON public.settlement_results;
CREATE POLICY "Table owner can delete settlement results"
ON public.settlement_results
FOR DELETE
USING (
    table_id IN (
        SELECT id FROM public.tables
        WHERE owner_id = auth.uid()
    )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_settlement_results_table_id
ON public.settlement_results(table_id);

-- ==============================================================================
-- Verify setup
-- ==============================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'settlement_results'
ORDER BY cmd, policyname;
