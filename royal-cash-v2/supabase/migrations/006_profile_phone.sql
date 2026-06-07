-- Personal phone for Bit payments (profile-level, not per-group player)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
