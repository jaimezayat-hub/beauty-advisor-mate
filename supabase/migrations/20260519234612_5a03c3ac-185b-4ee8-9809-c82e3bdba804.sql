
-- ============================================================
-- FASE A: cierre de gaps de modelo de datos
-- ============================================================

-- 1) goal_assignments (tabla única con regla XOR)
CREATE TABLE IF NOT EXISTS public.goal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NULL,
  store_id text NULL REFERENCES public.stores(code) ON DELETE CASCADE,
  region_code text NULL REFERENCES public.regions(code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goal_assignment_exactly_one
    CHECK ((user_id IS NOT NULL)::int + (store_id IS NOT NULL)::int + (region_code IS NOT NULL)::int = 1)
);

CREATE INDEX IF NOT EXISTS idx_goal_assignments_goal ON public.goal_assignments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_assignments_user ON public.goal_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goal_assignments_store ON public.goal_assignments(store_id) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goal_assignments_region ON public.goal_assignments(region_code) WHERE region_code IS NOT NULL;

ALTER TABLE public.goal_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_assignments admin write"
  ON public.goal_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin'))
  WITH CHECK (public.has_role(auth.uid(),'central_admin'));

CREATE POLICY "goal_assignments read scoped"
  ON public.goal_assignments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'central_admin')
    OR (user_id IS NOT NULL AND user_id = auth.uid())
    OR (store_id IS NOT NULL AND store_id = public.user_store(auth.uid()))
    OR (region_code IS NOT NULL AND region_code = public.user_region(auth.uid()))
  );

-- 2) Triggers updated_at
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'updated_at'
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT a.attisdropped
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
       CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();',
      r.tbl, r.tbl);
  END LOOP;
END $$;

-- 3) Triggers de auditoría en tablas críticas
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['consumers','purchases','appointments','user_roles','goals','arco_requests','goal_assignments']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit ON public.%I;
       CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_audit();',
      t, t);
  END LOOP;
END $$;

-- 4) Índices clave
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_consumers_brand_store ON public.consumers(brand, store_id);
CREATE INDEX IF NOT EXISTS idx_consumers_owner ON public.consumers(owner_ba_id);
CREATE INDEX IF NOT EXISTS idx_consumers_search_trgm
  ON public.consumers USING gin ((coalesce(first_name,'')||' '||coalesce(last_name,'')||' '||coalesce(email,'')||' '||coalesce(phone,'')) gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS uq_consumers_brand_docid
  ON public.consumers(brand, doc_id) WHERE deleted_at IS NULL AND doc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_attributes ON public.products USING gin (attributes);

CREATE INDEX IF NOT EXISTS idx_purchases_consumer_date ON public.purchases(consumer_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_store_date ON public.purchases(store_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_ba_date ON public.purchases(ba_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_ba_when ON public.appointments(ba_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_store_when ON public.appointments(store_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_followups_ba_due_pending ON public.follow_ups(ba_id, due_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_followups_consumer ON public.follow_ups(consumer_id);

CREATE INDEX IF NOT EXISTS idx_visits_ba_date ON public.visits(ba_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_store_date ON public.visits(store_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- 5) Vistas KPI (normales — siempre actualizadas)
CREATE OR REPLACE VIEW public.v_kpi_ba_daily AS
SELECT
  p.ba_id,
  p.store_id,
  p.brand,
  date_trunc('day', p.purchased_at)::date AS day,
  COUNT(*) AS tickets,
  COALESCE(SUM(p.total),0) AS sales,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(p.total),0)/COUNT(*) ELSE 0 END AS avg_ticket
FROM public.purchases p
WHERE p.deleted_at IS NULL
GROUP BY p.ba_id, p.store_id, p.brand, date_trunc('day', p.purchased_at);

CREATE OR REPLACE VIEW public.v_kpi_store_daily AS
SELECT
  p.store_id,
  p.brand,
  date_trunc('day', p.purchased_at)::date AS day,
  COUNT(*) AS tickets,
  COALESCE(SUM(p.total),0) AS sales,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(p.total),0)/COUNT(*) ELSE 0 END AS avg_ticket,
  COUNT(DISTINCT p.consumer_id) AS unique_consumers
FROM public.purchases p
WHERE p.deleted_at IS NULL
GROUP BY p.store_id, p.brand, date_trunc('day', p.purchased_at);

CREATE OR REPLACE VIEW public.v_kpi_region_daily AS
SELECT
  s.region_code,
  p.brand,
  date_trunc('day', p.purchased_at)::date AS day,
  COUNT(*) AS tickets,
  COALESCE(SUM(p.total),0) AS sales,
  CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(p.total),0)/COUNT(*) ELSE 0 END AS avg_ticket,
  COUNT(DISTINCT p.consumer_id) AS unique_consumers
FROM public.purchases p
JOIN public.stores s ON s.code = p.store_id
WHERE p.deleted_at IS NULL
GROUP BY s.region_code, p.brand, date_trunc('day', p.purchased_at);

CREATE OR REPLACE VIEW public.v_new_consumers_daily AS
SELECT
  c.owner_ba_id AS ba_id,
  c.store_id,
  c.brand,
  date_trunc('day', c.created_at)::date AS day,
  COUNT(*) AS new_consumers
FROM public.consumers c
WHERE c.deleted_at IS NULL
GROUP BY c.owner_ba_id, c.store_id, c.brand, date_trunc('day', c.created_at);

CREATE OR REPLACE VIEW public.v_followups_done_daily AS
SELECT
  f.ba_id,
  f.store_id,
  date_trunc('day', f.completed_at)::date AS day,
  COUNT(*) AS followups_done
FROM public.follow_ups f
WHERE f.completed_at IS NOT NULL
GROUP BY f.ba_id, f.store_id, date_trunc('day', f.completed_at);

CREATE OR REPLACE VIEW public.v_visits_daily AS
SELECT
  v.ba_id,
  v.store_id,
  v.brand,
  date_trunc('day', v.visited_at)::date AS day,
  COUNT(*) AS visits
FROM public.visits v
GROUP BY v.ba_id, v.store_id, v.brand, date_trunc('day', v.visited_at);

-- 6) Realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.follow_ups REPLICA IDENTITY FULL;
ALTER TABLE public.visits REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;       EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 7) Storage policies
-- tickets: alcance por tienda de la compra
DROP POLICY IF EXISTS "tickets read scope" ON storage.objects;
DROP POLICY IF EXISTS "tickets write scope" ON storage.objects;
CREATE POLICY "tickets read scope" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tickets'
  AND EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id::text = split_part(name, '/', 2)
      AND public.can_access_scope(p.store_id, p.ba_id)
  )
);
CREATE POLICY "tickets write scope" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tickets'
  AND EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id::text = split_part(name, '/', 2)
      AND public.can_access_scope(p.store_id, p.ba_id)
  )
);

-- consumer_avatars: alcance por consumidor (primer segmento del path = consumer_id)
DROP POLICY IF EXISTS "avatars read scope" ON storage.objects;
DROP POLICY IF EXISTS "avatars write scope" ON storage.objects;
CREATE POLICY "avatars read scope" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'consumer_avatars'
  AND EXISTS (
    SELECT 1 FROM public.consumers c
    WHERE c.id::text = split_part(name, '/', 1)
      AND public.can_access_scope(c.store_id, c.owner_ba_id)
  )
);
CREATE POLICY "avatars write scope" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'consumer_avatars'
  AND EXISTS (
    SELECT 1 FROM public.consumers c
    WHERE c.id::text = split_part(name, '/', 1)
      AND public.can_access_scope(c.store_id, c.owner_ba_id)
  )
);

-- catalog: solo admin
DROP POLICY IF EXISTS "catalog admin read" ON storage.objects;
DROP POLICY IF EXISTS "catalog admin write" ON storage.objects;
CREATE POLICY "catalog admin read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'catalog' AND public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "catalog admin write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalog' AND public.has_role(auth.uid(),'central_admin'));

-- whatsapp_assets: lectura para auth, escritura solo admin
DROP POLICY IF EXISTS "wa_assets read auth" ON storage.objects;
DROP POLICY IF EXISTS "wa_assets admin write" ON storage.objects;
CREATE POLICY "wa_assets read auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp_assets');
CREATE POLICY "wa_assets admin write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp_assets' AND public.has_role(auth.uid(),'central_admin'));
