
-- ENUMS
CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','done','no_show','cancelled');
CREATE TYPE public.appointment_type   AS ENUM ('makeover','consulta','follow_up','evento');
CREATE TYPE public.purchase_source    AS ENUM ('pos','manual','scan');
CREATE TYPE public.consent_channel    AS ENUM ('whatsapp','email','sms');
CREATE TYPE public.notification_channel AS ENUM ('inapp','email','whatsapp','sms');
CREATE TYPE public.followup_trigger   AS ENUM ('post_purchase','birthday','inactivity','sample','manual');
CREATE TYPE public.followup_outcome   AS ENUM ('contacted','no_answer','opted_out','converted','pending');
CREATE TYPE public.whatsapp_status    AS ENUM ('stub','queued','sent','failed');
CREATE TYPE public.goal_scope         AS ENUM ('ba','store','region');
CREATE TYPE public.goal_metric        AS ENUM ('sales','tickets','conversion','new_consumers','samples_converted');

-- ORG
CREATE TABLE public.regions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stores (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region_code TEXT NOT NULL REFERENCES public.regions(code) ON DELETE RESTRICT,
  brand public.brand NOT NULL,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions read auth" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "regions admin write" ON public.regions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "stores read auth" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "stores admin write" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));

-- HELPERS
CREATE OR REPLACE FUNCTION public.user_store(_user_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.profiles WHERE id = _user_id;
$$;
CREATE OR REPLACE FUNCTION public.user_region(_user_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT region FROM public.profiles WHERE id = _user_id;
$$;
CREATE OR REPLACE FUNCTION public.user_brand(_user_id UUID)
RETURNS public.brand LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT brand FROM public.profiles WHERE id = _user_id;
$$;
CREATE OR REPLACE FUNCTION public.can_access_scope(_store TEXT, _ba UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(),'central_admin')
    OR (public.has_role(auth.uid(),'zone_supervisor')
        AND _store IN (SELECT code FROM public.stores WHERE region_code = public.user_region(auth.uid())))
    OR (public.has_role(auth.uid(),'store_manager') AND _store = public.user_store(auth.uid()))
    OR (public.has_role(auth.uid(),'ba') AND _ba = auth.uid());
$$;

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand public.brand NOT NULL,
  sku TEXT NOT NULL,
  ean TEXT,
  name TEXT NOT NULL,
  category TEXT, subcategory TEXT, family TEXT,
  price NUMERIC(10,2), currency TEXT DEFAULT 'MXN',
  active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand, sku)
);
CREATE INDEX idx_products_brand_active ON public.products(brand, active);
CREATE INDEX idx_products_ean ON public.products(brand, ean);
CREATE INDEX idx_products_attrs ON public.products USING GIN (attributes);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reason TEXT, weight NUMERIC(4,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, recommended_product_id)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read auth" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "prod_recs read auth" ON public.product_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_recs admin write" ON public.product_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));

-- SAMPLES
CREATE TABLE public.samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand public.brand NOT NULL, sku TEXT NOT NULL, name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand, sku)
);
CREATE TABLE public.store_sample_stock (
  store_code TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,
  sample_id UUID NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_code, sample_id)
);
CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON public.store_sample_stock
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_sample_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "samples read auth" ON public.samples FOR SELECT TO authenticated USING (true);
CREATE POLICY "samples admin write" ON public.samples FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "stock scope read" ON public.store_sample_stock FOR SELECT TO authenticated
  USING (public.can_access_scope(store_code, NULL));
CREATE POLICY "stock manager write" ON public.store_sample_stock FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')
         OR (public.has_role(auth.uid(),'store_manager') AND store_code = public.user_store(auth.uid())))
  WITH CHECK (public.has_role(auth.uid(),'central_admin')
         OR (public.has_role(auth.uid(),'store_manager') AND store_code = public.user_store(auth.uid())));

-- CONSUMERS
CREATE TABLE public.consumers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand public.brand NOT NULL,
  first_name TEXT NOT NULL, last_name TEXT,
  email TEXT, phone TEXT, doc_id TEXT,
  birthday DATE, gender TEXT, city TEXT, segment TEXT,
  lifetime_value NUMERIC(12,2) DEFAULT 0,
  store_id TEXT REFERENCES public.stores(code) ON DELETE SET NULL,
  owner_ba_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_consumers_doc_alive ON public.consumers (brand, doc_id) WHERE deleted_at IS NULL AND doc_id IS NOT NULL;
CREATE INDEX idx_consumers_store ON public.consumers(brand, store_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_consumers_owner ON public.consumers(owner_ba_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_consumers_search ON public.consumers USING GIN (
  to_tsvector('simple', coalesce(first_name,'')||' '||coalesce(last_name,'')||' '||coalesce(email,'')||' '||coalesce(phone,''))
);
CREATE TRIGGER trg_consumers_updated BEFORE UPDATE ON public.consumers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.consumer_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  channel public.consent_channel NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ, source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consumer_id, channel)
);
CREATE TABLE public.consumer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  key TEXT NOT NULL, value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consumer_id, key)
);
CREATE TABLE public.consumer_tags (
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_id, tag)
);
ALTER TABLE public.consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consumers scope read" ON public.consumers FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_scope(store_id, owner_ba_id));
CREATE POLICY "consumers ba insert" ON public.consumers FOR INSERT TO authenticated
  WITH CHECK (
    brand = public.user_brand(auth.uid())
    AND (
      public.has_role(auth.uid(),'central_admin')
      OR (public.has_role(auth.uid(),'ba') AND owner_ba_id = auth.uid() AND store_id = public.user_store(auth.uid()))
      OR (public.has_role(auth.uid(),'store_manager') AND store_id = public.user_store(auth.uid()))
    )
  );
CREATE POLICY "consumers scope update" ON public.consumers FOR UPDATE TO authenticated
  USING (public.can_access_scope(store_id, owner_ba_id))
  WITH CHECK (public.can_access_scope(store_id, owner_ba_id));
CREATE POLICY "consents via consumer" ON public.consumer_consents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)));
CREATE POLICY "prefs via consumer" ON public.consumer_preferences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)));
CREATE POLICY "tags via consumer" ON public.consumer_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)));

-- PURCHASES
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE RESTRICT,
  ba_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE RESTRICT,
  brand public.brand NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ticket_number TEXT, source public.purchase_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_purchases_consumer ON public.purchases(consumer_id, purchased_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchases_store ON public.purchases(store_id, purchased_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchases_ba ON public.purchases(ba_id, purchased_at) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_purchases_updated BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sku_snapshot TEXT NOT NULL, name_snapshot TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_pitems_purchase ON public.purchase_items(purchase_id);

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, ocr_text TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases scope read" ON public.purchases FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_scope(store_id, ba_id));
CREATE POLICY "purchases ba insert" ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (
    brand = public.user_brand(auth.uid())
    AND (
      public.has_role(auth.uid(),'central_admin')
      OR (public.has_role(auth.uid(),'ba') AND ba_id = auth.uid() AND store_id = public.user_store(auth.uid()))
      OR (public.has_role(auth.uid(),'store_manager') AND store_id = public.user_store(auth.uid()))
    )
  );
CREATE POLICY "purchases scope update" ON public.purchases FOR UPDATE TO authenticated
  USING (public.can_access_scope(store_id, ba_id))
  WITH CHECK (public.can_access_scope(store_id, ba_id));
CREATE POLICY "pitems via purchase" ON public.purchase_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.can_access_scope(p.store_id, p.ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.can_access_scope(p.store_id, p.ba_id)));
CREATE POLICY "tickets via purchase" ON public.tickets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.can_access_scope(p.store_id, p.ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.can_access_scope(p.store_id, p.ba_id)));

-- SAMPLE DELIVERIES
CREATE TABLE public.sample_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  sample_id UUID NOT NULL REFERENCES public.samples(id) ON DELETE RESTRICT,
  ba_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE RESTRICT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(), notes TEXT,
  converted_purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_samples_ba ON public.sample_deliveries(ba_id, delivered_at);
CREATE INDEX idx_samples_store ON public.sample_deliveries(store_id, delivered_at);
ALTER TABLE public.sample_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sample deliv scope read" ON public.sample_deliveries FOR SELECT TO authenticated
  USING (public.can_access_scope(store_id, ba_id));
CREATE POLICY "sample deliv ba insert" ON public.sample_deliveries FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'central_admin')
    OR (public.has_role(auth.uid(),'ba') AND ba_id = auth.uid() AND store_id = public.user_store(auth.uid()))
    OR (public.has_role(auth.uid(),'store_manager') AND store_id = public.user_store(auth.uid()))
  );
CREATE POLICY "sample deliv scope update" ON public.sample_deliveries FOR UPDATE TO authenticated
  USING (public.can_access_scope(store_id, ba_id)) WITH CHECK (public.can_access_scope(store_id, ba_id));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  ba_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE RESTRICT,
  brand public.brand NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 30,
  type public.appointment_type NOT NULL DEFAULT 'consulta',
  status public.appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appts_ba ON public.appointments(ba_id, scheduled_at);
CREATE INDEX idx_appts_store ON public.appointments(store_id, scheduled_at);
CREATE TRIGGER trg_appts_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL,
  send_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ, status TEXT
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appts scope read" ON public.appointments FOR SELECT TO authenticated
  USING (public.can_access_scope(store_id, ba_id));
CREATE POLICY "appts ba insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    brand = public.user_brand(auth.uid())
    AND (
      public.has_role(auth.uid(),'central_admin')
      OR (public.has_role(auth.uid(),'ba') AND ba_id = auth.uid() AND store_id = public.user_store(auth.uid()))
      OR (public.has_role(auth.uid(),'store_manager') AND store_id = public.user_store(auth.uid()))
    )
  );
CREATE POLICY "appts scope update" ON public.appointments FOR UPDATE TO authenticated
  USING (public.can_access_scope(store_id, ba_id)) WITH CHECK (public.can_access_scope(store_id, ba_id));
CREATE POLICY "reminders via appt" ON public.appointment_reminders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND public.can_access_scope(a.store_id, a.ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND public.can_access_scope(a.store_id, a.ba_id)));

-- FOLLOW-UPS
CREATE TABLE public.follow_up_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand public.brand NOT NULL, name TEXT NOT NULL,
  trigger public.followup_trigger NOT NULL,
  days_offset INTEGER NOT NULL DEFAULT 0,
  channel public.notification_channel NOT NULL DEFAULT 'whatsapp',
  body_template TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  ba_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  store_id TEXT NOT NULL REFERENCES public.stores(code) ON DELETE RESTRICT,
  template_id UUID REFERENCES public.follow_up_templates(id) ON DELETE SET NULL,
  trigger public.followup_trigger NOT NULL DEFAULT 'manual',
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  channel public.notification_channel,
  outcome public.followup_outcome NOT NULL DEFAULT 'pending',
  notes TEXT,
  related_purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  related_sample_id UUID REFERENCES public.sample_deliveries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_followups_due ON public.follow_ups(ba_id, due_at) WHERE completed_at IS NULL;
CREATE TRIGGER trg_followups_updated BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.follow_up_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fu_templates read auth" ON public.follow_up_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "fu_templates admin write" ON public.follow_up_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "follow_ups scope read" ON public.follow_ups FOR SELECT TO authenticated
  USING (public.can_access_scope(store_id, ba_id));
CREATE POLICY "follow_ups ba insert" ON public.follow_ups FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'central_admin')
    OR (public.has_role(auth.uid(),'ba') AND ba_id = auth.uid() AND store_id = public.user_store(auth.uid()))
    OR (public.has_role(auth.uid(),'store_manager') AND store_id = public.user_store(auth.uid()))
  );
CREATE POLICY "follow_ups scope update" ON public.follow_ups FOR UPDATE TO authenticated
  USING (public.can_access_scope(store_id, ba_id)) WITH CHECK (public.can_access_scope(store_id, ba_id));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);
CREATE TABLE public.notification_prefs (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, channel)
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif own update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif admin insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'central_admin') OR user_id = auth.uid());
CREATE POLICY "notif_prefs own" ON public.notification_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- WHATSAPP
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand public.brand NOT NULL, code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es_MX',
  body TEXT NOT NULL, variables JSONB DEFAULT '[]'::jsonb,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand, code, language)
);
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  rendered_body TEXT NOT NULL,
  status public.whatsapp_status NOT NULL DEFAULT 'stub',
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_id TEXT
);
CREATE INDEX idx_wa_consumer ON public.whatsapp_messages(consumer_id, sent_at DESC);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_templates read auth" ON public.whatsapp_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "wa_templates admin write" ON public.whatsapp_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "wa_msgs via consumer" ON public.whatsapp_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.consumers c WHERE c.id = consumer_id AND public.can_access_scope(c.store_id, c.owner_ba_id)));

-- GOALS
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand public.brand NOT NULL,
  scope public.goal_scope NOT NULL,
  scope_ref TEXT NOT NULL,
  metric public.goal_metric NOT NULL,
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  target_value NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_lookup ON public.goals(brand, scope, scope_ref, period_start);
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals read auth" ON public.goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "goals admin write" ON public.goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'central_admin')) WITH CHECK (public.has_role(auth.uid(),'central_admin'));

-- AUDIT & EVENTS
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID, action TEXT NOT NULL,
  entity TEXT NOT NULL, entity_id TEXT,
  before JSONB, after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_log(entity, entity_id, created_at DESC);
CREATE TABLE public.event_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID, event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_user ON public.event_log(user_id, created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "events admin read" ON public.event_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "events self insert" ON public.event_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE OR REPLACE FUNCTION public.tg_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, before, after)
  VALUES (
    auth.uid(), TG_OP, TG_TABLE_NAME,
    COALESCE((NEW).id::text, (OLD).id::text),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_audit_consumers   AFTER INSERT OR UPDATE OR DELETE ON public.consumers   FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_purchases   AFTER INSERT OR UPDATE OR DELETE ON public.purchases   FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_appts       AFTER INSERT OR UPDATE OR DELETE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_user_roles  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
CREATE TRIGGER trg_audit_goals       AFTER INSERT OR UPDATE OR DELETE ON public.goals       FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES
  ('tickets','tickets', false),
  ('consumer_avatars','consumer_avatars', false),
  ('catalog','catalog', false),
  ('whatsapp_assets','whatsapp_assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tickets read scope" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tickets' AND public.can_access_scope((storage.foldername(name))[1], NULL));
CREATE POLICY "tickets write scope" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tickets' AND public.can_access_scope((storage.foldername(name))[1], NULL));
CREATE POLICY "avatars read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'consumer_avatars');
CREATE POLICY "avatars write auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'consumer_avatars');
CREATE POLICY "catalog admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'catalog' AND public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "catalog admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalog' AND public.has_role(auth.uid(),'central_admin'));
CREATE POLICY "wa_assets read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'whatsapp_assets');
CREATE POLICY "wa_assets admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp_assets' AND public.has_role(auth.uid(),'central_admin'));
