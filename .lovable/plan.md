# Modelo de datos completo — BA Companion (Lancôme / YSL)

Estado: el 80% del modelo ya está creado en Supabase. Este plan documenta el ERD completo y cierra los gaps pendientes para que la app sea 100% funcional (datos reales + RLS + frontend + deploy).

---

## 1. ERD (texto)

```text
regions (code PK, name)
  └── stores (code PK, name, region_code FK→regions, brand?, address, active)        [151 tiendas, 7 regiones]
        └── profiles (id PK = auth.users.id, display_name, email, brand, store_id FK→stores, region FK→regions, active)
              └── user_roles (user_id FK→profiles, role: ba|store_manager|zone_supervisor|central_admin)

CONSUMIDOR (núcleo CRM)
consumers (id, brand, first_name, last_name, email, phone, doc_id, birthday, gender, city,
           segment, lifetime_value, store_id FK→stores, owner_ba_id FK→profiles, deleted_at)
  ├── consumer_consents       (consumer_id, channel, granted, granted_at, revoked_at, source)
  ├── consumer_preferences    (consumer_id, key, value)         -- skin_type, undertone, fragrance...
  ├── consumer_tags           (consumer_id, tag)                -- VIP, alérgico
  ├── notice_acceptances      (consumer_id, notice_id FK→privacy_notices, accepted_at, signature_ref, ip)
  └── arco_requests           (consumer_id, request_type, status, resolved_by FK→profiles)

CATÁLOGO
products (id, brand, sku UNIQUE, ean, name, category, subcategory, family, price, image_url, attributes JSONB, active)
  └── product_recommendations (product_id, recommended_product_id, reason, weight)
samples  (id, brand, sku, name, active)
  └── store_sample_stock      (store_code FK→stores, sample_id FK→samples, qty)

TRANSACCIONAL
purchases (id, consumer_id, ba_id FK→profiles, store_id FK→stores, brand, total, currency,
           purchased_at, ticket_number, source, deleted_at)
  ├── purchase_items (purchase_id, product_id FK→products, sku_snapshot, name_snapshot, qty, unit_price, discount)
  └── tickets        (purchase_id, storage_path → bucket `tickets`, ocr_text, uploaded_by)

sample_deliveries (consumer_id, sample_id, ba_id, store_id, delivered_at, converted_purchase_id FK→purchases)

ENGAGEMENT
appointments (id, consumer_id, ba_id, store_id, brand, scheduled_at, duration_min, type, status, created_by)
  └── appointment_reminders (appointment_id, channel, send_at, sent_at, status)

visits (id, consumer_id, ba_id, store_id, brand, visited_at, reason_id FK→visit_reasons, appointment_id?, duration_min)
visit_reasons (id, code UNIQUE, name, active)

follow_up_templates (id, brand, name, trigger, days_offset, channel, body_template, active)
follow_ups (id, consumer_id, ba_id, store_id, template_id FK→follow_up_templates,
            due_at, completed_at, channel, outcome, related_purchase_id FK→purchases, related_sample_id FK→sample_deliveries)

COMMS
notifications      (id, user_id FK→profiles, type, title, body, payload JSONB, read_at)
notification_prefs (user_id, channel, enabled)
whatsapp_templates (id, brand, code UNIQUE, language, body, variables JSONB, approved)
whatsapp_messages  (id, consumer_id, template_id, rendered_body, status, sent_by, sent_at, external_id)

PERFORMANCE
goals (id, brand, scope: ba|store|region, scope_ref, metric, period_start, period_end, target_value)
goal_assignments (goal_id, user_id|store_id|region_code)                    -- FALTA
mv_kpi_ba_daily / mv_kpi_store_daily / mv_kpi_region_daily                  -- FALTA (vistas materializadas)

AUDITORÍA
audit_log (actor_id, action, entity, entity_id, before JSONB, after JSONB)  -- triggers en tablas críticas
event_log (user_id, event_type, payload JSONB)                              -- analítica de uso
privacy_notices (id, brand, version, effective_from, effective_to, body_text, body_url)
```

---

## 2. Gaps detectados (lo que falta para 100% funcional)

### 2.1 Base de datos
1. **`goal_assignments`** — tabla para asignar metas a múltiples destinatarios.
2. **Vistas materializadas KPI** — `mv_kpi_ba_daily`, `mv_kpi_store_daily`, `mv_kpi_region_daily` con refresh diario (función + cron).
3. **Triggers de auditoría** — `tg_audit` ya existe, falta engancharlo a `consumers`, `purchases`, `appointments`, `user_roles`, `goals`, `arco_requests`.
4. **Triggers `updated_at`** en tablas que lo tienen pero sin trigger.
5. **Índices clave faltantes**:
   - GIN tsvector en `consumers(first_name, last_name, email, phone)` para búsqueda RF-09.
   - GIN sobre `products.attributes`.
   - `purchases(consumer_id, purchased_at DESC)`, `(store_id, purchased_at)`, `(ba_id, purchased_at)`.
   - `appointments(ba_id, scheduled_at)`, `(store_id, scheduled_at)`.
   - `follow_ups(ba_id, due_at) WHERE completed_at IS NULL`.
   - `consumers(brand, store_id)`, `consumers(owner_ba_id)`.
   - UNIQUE parcial `consumers(brand, doc_id) WHERE deleted_at IS NULL`.
6. **Realtime publication** — añadir `appointments`, `notifications`, `follow_ups`, `visits` a `supabase_realtime`.
7. **Soft-delete RLS** en `purchases` ya existe; verificar policy DELETE bloqueado en todas las transaccionales (ya OK).
8. **Storage policies** — los 4 buckets existen sin policies visibles; agregar policies por scope (`tickets` por `store_id` del purchase; `consumer_avatars` por scope del consumer; `catalog` y `whatsapp_assets` solo admin write).

### 2.2 Frontend (reemplazar mocks por Supabase)
Hoy `useApp` lee de `SEED_*` (Zustand persistido). Migración por página:
- `Login.tsx` / `AuthSync.tsx` — ya hay `@supabase/auth`; verificar flujo signup/login email + Google.
- `Home.tsx`, `Consumers.tsx`, `ConsumerProfile.tsx`, `NewConsumer.tsx` — `from('consumers')`.
- `Purchases.tsx` — `from('purchases')` + `purchase_items` + upload a bucket `tickets`.
- `Agenda.tsx` — `from('appointments')` + realtime channel.
- `FollowUp.tsx` — `from('follow_ups')` + templates.
- `Recommendations.tsx` — `from('products')` + `product_recommendations`.
- `Performance.tsx` / `Reports.tsx` — `from('mv_kpi_*')`.
- `Settings.tsx` — administración (stores, regions, users, goals) gated por `central_admin`.
- `RouteGuard` — ya usa permissions; debe leer `user_roles` reales.

### 2.3 Edge Functions (a crear cuando se cablee el front)
- `refresh-kpis` (cron diario, refresca vistas materializadas).
- `daily-followups-generator` (cron, crea `follow_ups` por trigger de template).
- `import-catalog` (CSV → `products`).
- `export-report` (CSV/PDF firmado).
- `send-whatsapp` (stub hoy; cuando se integre WA Business API).

### 2.4 Auth / Deploy
- Confirmar email signups habilitado (no auto-confirm por defecto).
- Habilitar Google OAuth (`configure_social_auth`).
- Limpiar 5 códigos de región obsoletos (`SW, NW, OR, CS, CN`) en frontend.
- Publish: frontend requiere botón "Update"; edge functions y migraciones se despliegan auto.

---

## 3. Cobertura requisitos → tabla

| Bloque | Requisitos | Tablas |
|---|---|---|
| Auth + RBAC | RF-01..06, 32, 49–55 | `profiles`, `user_roles`, `audit_log` |
| Búsqueda + alta consumidor | RF-09, 12, 13, 15, 17 | `consumers`, `consumer_*`, `notice_acceptances` |
| Escaneo SKU | RF-14 | `products` |
| Compras / ticket | RF-19, 20, 21 | `purchases`, `purchase_items`, `tickets` |
| Recomendaciones | RF-22, 23 | `products`, `product_recommendations` |
| Muestras | RF-24, 25 | `samples`, `store_sample_stock`, `sample_deliveries` |
| Agenda | RF-26..29 | `appointments`, `appointment_reminders` |
| Visitas | RF-30 | `visits`, `visit_reasons` |
| Follow-up | RF-31, 34 | `follow_ups`, `follow_up_templates` |
| Notificaciones | RF-35, 36 | `notifications`, `notification_prefs` |
| KPIs / Performance | RF-38..45 | `mv_kpi_*` (gap), `goals`, `goal_assignments` (gap) |
| Metas | RF-48 | `goals`, `goal_assignments` (gap) |
| Reportes | RF-56 | `export-report` edge fn (gap) |
| Privacidad / ARCO | RNF-04 | `privacy_notices`, `notice_acceptances`, `consumer_consents`, `arco_requests` |
| WhatsApp | RNF-11 | `whatsapp_templates`, `whatsapp_messages` (stub) |
| Auditoría | RNF-13..15 | `audit_log`, `event_log` |

---

## 4. Plan de ejecución (orden propuesto)

**Fase A — Cerrar gaps de DB (1 migración):**
1. Crear `goal_assignments`.
2. Adjuntar triggers `tg_audit` y `tg_set_updated_at` a tablas faltantes.
3. Crear índices listados en §2.1.5.
4. Crear vistas materializadas `mv_kpi_*` + función `refresh_kpis()`.
5. Activar realtime en `appointments`, `notifications`, `follow_ups`, `visits`.
6. Storage policies en los 4 buckets.
7. Limpiar regiones obsoletas en frontend.

**Fase B — Auth real (1 migración + config):**
8. `configure_auth` (signup ON, auto-confirm OFF).
9. `configure_social_auth` Google.
10. Wire `Login` + `AuthSync` a `profiles` reales (eliminar `loginAsRealUser` mock).

**Fase C — Cablear páginas a Supabase (página por página):**
11. `Consumers` + `ConsumerProfile` + `NewConsumer`.
12. `Purchases` + upload tickets.
13. `Agenda` con realtime.
14. `FollowUp`.
15. `Recommendations`.
16. `Performance` + `Reports` (lee `mv_kpi_*`).
17. `Settings` (admin: stores, users, goals, templates).

**Fase D — Edge functions y cron:**
18. `refresh-kpis` (cron diario).
19. `daily-followups-generator` (cron diario).
20. `export-report` (on-demand).
21. `import-catalog` (admin upload).

**Fase E — Deploy:**
22. Publish frontend.
23. Verificar edge functions y cron activos.

---

## 5. Decisiones que necesito confirmes antes de migrar

1. **`goal_assignments`**: ¿OK con una sola tabla con `user_id|store_id|region_code` nullables, o prefieres 3 tablas separadas?
2. **Vistas materializadas vs vistas normales**: materializadas son más rápidas pero requieren refresh (cron). ¿OK?
3. **Realtime**: ¿activamos en las 4 tablas (`appointments`, `notifications`, `follow_ups`, `visits`) o solo notificaciones?
4. **Orden de ejecución**: ¿hago Fase A completa primero (DB) y luego B–E, o prefieres ir página por página integrando todo?
