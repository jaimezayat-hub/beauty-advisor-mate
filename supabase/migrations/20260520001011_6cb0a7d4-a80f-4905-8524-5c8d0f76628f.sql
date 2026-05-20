-- Realtime: REPLICA IDENTITY FULL + publicación
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.follow_ups   REPLICA IDENTITY FULL;
ALTER TABLE public.visits       REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

-- Storage policies para bucket "tickets" (ya existe)
DROP POLICY IF EXISTS "tickets read own" ON storage.objects;
DROP POLICY IF EXISTS "tickets upload own" ON storage.objects;
DROP POLICY IF EXISTS "tickets update own" ON storage.objects;

CREATE POLICY "tickets read own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tickets' AND (
    public.has_role(auth.uid(),'central_admin')
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.purchases p ON p.id = t.purchase_id
      WHERE t.storage_path = name
        AND public.can_access_scope(p.store_id, p.ba_id)
    )
  )
);

CREATE POLICY "tickets upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tickets');

CREATE POLICY "tickets update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tickets' AND owner = auth.uid())
WITH CHECK (bucket_id = 'tickets' AND owner = auth.uid());
