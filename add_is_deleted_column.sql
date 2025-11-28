-- Add is_deleted column to tables table for soft delete functionality
-- Run this in Supabase SQL Editor

-- Add is_deleted column if it doesn't exist
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Update existing tables to have is_deleted = false (if null)
UPDATE public.tables 
SET is_deleted = false 
WHERE is_deleted IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tables_is_deleted ON public.tables(is_deleted);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tables' AND column_name = 'is_deleted';

SELECT '✅ is_deleted column added successfully!' as status;




