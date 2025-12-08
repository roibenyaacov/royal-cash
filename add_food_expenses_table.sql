-- ==============================================================================
-- Add Food Expenses Table for Tracking Food History
-- ==============================================================================
-- This creates a new table to track all food expenses so users can view
-- a history of meals ordered during the game.
-- ==============================================================================

-- Create food_expenses table
CREATE TABLE IF NOT EXISTS public.food_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES public.table_players(id) ON DELETE CASCADE,
    total_amount NUMERIC NOT NULL,
    split_mode TEXT NOT NULL CHECK (split_mode IN ('equal', 'individual')),
    consumers JSONB NOT NULL, -- Array of {player_id, amount, player_name}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_food_expenses_table_id ON public.food_expenses(table_id);
CREATE INDEX IF NOT EXISTS idx_food_expenses_created_at ON public.food_expenses(created_at DESC);

-- Enable RLS
ALTER TABLE public.food_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view food expenses from tables they have access to
DROP POLICY IF EXISTS "Users can view food expenses" ON public.food_expenses;
CREATE POLICY "Users can view food expenses"
ON public.food_expenses
FOR SELECT
USING (
    table_id IN (
        SELECT id FROM public.tables
        WHERE owner_id = auth.uid() OR
        id IN (
            SELECT table_id FROM public.table_players
            WHERE user_id = auth.uid()
        )
    )
);

-- RLS Policies: Users can insert food expenses if they're in the table
DROP POLICY IF EXISTS "Users can insert food expenses" ON public.food_expenses;
CREATE POLICY "Users can insert food expenses"
ON public.food_expenses
FOR INSERT
WITH CHECK (
    table_id IN (
        SELECT id FROM public.tables
        WHERE owner_id = auth.uid() OR
        id IN (
            SELECT table_id FROM public.table_players
            WHERE user_id = auth.uid()
        )
    )
);

-- Verify table was created
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'food_expenses'
ORDER BY ordinal_position;
