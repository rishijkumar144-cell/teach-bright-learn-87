
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plus_until timestamptz,
  ADD COLUMN IF NOT EXISTS ai_credits_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_credits_week_start date NOT NULL DEFAULT current_date;
