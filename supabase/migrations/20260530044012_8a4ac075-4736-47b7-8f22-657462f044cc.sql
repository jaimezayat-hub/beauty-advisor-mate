
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS purchased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_total numeric,
  ADD COLUMN IF NOT EXISTS purchase_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_id uuid REFERENCES public.follow_ups(id) ON DELETE SET NULL;
