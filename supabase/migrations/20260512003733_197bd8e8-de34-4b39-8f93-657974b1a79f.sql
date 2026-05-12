
-- Visit reasons catalog
CREATE TABLE public.visit_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visit_reasons read auth" ON public.visit_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "visit_reasons admin write" ON public.visit_reasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin'))
  WITH CHECK (public.has_role(auth.uid(),'central_admin'));

-- Visits
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL,
  ba_id uuid NOT NULL,
  store_id text NOT NULL,
  brand public.brand NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  reason_id uuid REFERENCES public.visit_reasons(id),
  appointment_id uuid REFERENCES public.appointments(id),
  duration_min integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_visits_consumer ON public.visits(consumer_id);
CREATE INDEX idx_visits_ba_date ON public.visits(ba_id, visited_at DESC);
CREATE INDEX idx_visits_store_date ON public.visits(store_id, visited_at DESC);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visits scope read" ON public.visits FOR SELECT TO authenticated
  USING (public.can_access_scope(store_id, ba_id));
CREATE POLICY "visits ba insert" ON public.visits FOR INSERT TO authenticated
  WITH CHECK (
    brand = public.user_brand(auth.uid()) AND (
      public.has_role(auth.uid(),'central_admin')
      OR (public.has_role(auth.uid(),'ba') AND ba_id = auth.uid() AND store_id = public.user_store(auth.uid()))
      OR (public.has_role(auth.uid(),'store_manager') AND store_id = public.user_store(auth.uid()))
    )
  );
CREATE POLICY "visits scope update" ON public.visits FOR UPDATE TO authenticated
  USING (public.can_access_scope(store_id, ba_id))
  WITH CHECK (public.can_access_scope(store_id, ba_id));

-- Privacy notices (versioned)
CREATE TABLE public.privacy_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand public.brand NOT NULL,
  version text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  body_url text,
  body_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand, version)
);
ALTER TABLE public.privacy_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notices read auth" ON public.privacy_notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "notices admin write" ON public.privacy_notices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin'))
  WITH CHECK (public.has_role(auth.uid(),'central_admin'));

-- Notice acceptances per consumer
CREATE TABLE public.notice_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL,
  notice_id uuid NOT NULL REFERENCES public.privacy_notices(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  signature_ref text,
  captured_by_ba uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notice_acc_consumer ON public.notice_acceptances(consumer_id);
ALTER TABLE public.notice_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notice_acc via consumer" ON public.notice_acceptances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = notice_acceptances.consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = notice_acceptances.consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)));

-- ARCO requests
CREATE TYPE public.arco_type AS ENUM ('acceso','rectificacion','cancelacion','oposicion');
CREATE TYPE public.arco_status AS ENUM ('recibida','en_proceso','completada','rechazada');

CREATE TABLE public.arco_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL,
  request_type public.arco_type NOT NULL,
  status public.arco_status NOT NULL DEFAULT 'recibida',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  notes text,
  resolution_notes text,
  requested_by_ba uuid,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_arco_consumer ON public.arco_requests(consumer_id);
CREATE INDEX idx_arco_status ON public.arco_requests(status);
ALTER TABLE public.arco_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arco via consumer read" ON public.arco_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = arco_requests.consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)));
CREATE POLICY "arco insert via consumer" ON public.arco_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = arco_requests.consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)));
CREATE POLICY "arco admin update" ON public.arco_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'central_admin'))
  WITH CHECK (public.has_role(auth.uid(),'central_admin'));

CREATE TRIGGER trg_arco_updated BEFORE UPDATE ON public.arco_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.arco_requests;
