
# Plan de Estructura de Datos en Supabase — BA Companion (Lancôme / YSL)

Objetivo: diseñar el esquema completo de base de datos, relaciones, RLS y storage que soporte TODOS los requerimientos obligatorios y deseables verdes, antes de tocar código. Lovable Cloud queda fuera; usaremos integración directa a Supabase.

---

## 1. Principios de diseño

- **Multi-marca**: cada registro lleva `brand` (`lancome` | `ysl`) para aislar datos por marca cuando aplica.
- **Multi-tienda y multi-región**: jerarquía `region → store → ba` para scoping de permisos.
- **Roles fuera de `profiles`**: tabla dedicada `user_roles` + `has_role()` SECURITY DEFINER (evita recursión RLS y escalación de privilegios).
- **No FK a `auth.users`** en lógica de negocio: usamos `profiles.id = auth.users.id` y referenciamos `profiles`.
- **Auditoría**: `created_at`, `updated_at`, `created_by` en tablas transaccionales.
- **Soft delete** (`deleted_at`) en consumidores y compras (RNF de trazabilidad).
- **Catálogos normalizados** (productos, tiendas, motivos) para evitar strings mágicos.
- **Realtime** habilitado en tablas que alimentan agenda, notificaciones y dashboard.

---

## 2. Mapa Requerimiento → Tabla principal

| Req | Funcionalidad | Tabla(s) |
|---|---|---|
| RF-01..06 | Login, perfil BA, jerarquía | `profiles`, `user_roles`, `stores`, `regions` |
| RF-09, RF-12, RF-13 | Búsqueda y registro de consumidor | `consumers`, `consumer_consents` |
| RF-14 | Escaneo SKU real | `products` (consulta) |
| RF-15, RF-17 | Perfil 360° del consumidor | `consumers`, `consumer_preferences`, `purchases`, `interactions` |
| RF-19, RF-20, RF-21 | Registro de compra y ticket | `purchases`, `purchase_items`, `tickets` (storage) |
| RF-22, RF-23 | Recomendaciones y bundles | `products`, `product_recommendations`, `recommendation_events` |
| RF-24, RF-25 | Muestras (tracking) | `samples`, `sample_deliveries` |
| RF-26..29 | Agenda y citas | `appointments`, `appointment_reminders` |
| RF-31, RF-34 | Seguimiento post-venta | `follow_ups`, `follow_up_templates` |
| RF-35, RF-36 | Notificaciones internas | `notifications`, `notification_prefs` |
| RF-38..45 | Performance / KPIs BA, tienda, región | vistas materializadas `mv_kpi_*` sobre `purchases`, `appointments`, `interactions`, `goals` |
| RF-48 | Metas y bonos | `goals`, `goal_assignments` |
| RF-56 | Exportes y reportes | vistas + edge function de export |
| RF-14, RF-32, RF-49, RF-50..55 | Auth real, RBAC, sesión | `profiles`, `user_roles`, `audit_log` |
| RNF-01..08 | Seguridad, performance, disponibilidad | RLS, índices, paginación, backups Supabase |
| RNF-11 (verde, parqueado) | WhatsApp templates | `whatsapp_templates`, `whatsapp_messages` (estructura lista, sin envío real) |
| RNF-13..15 | Logs y auditoría | `audit_log`, `event_log` |

---

## 3. Esquema detallado

### 3.1 Identidad y organización

```text
regions (id, code, name)
  └── stores (id, code, name, region_id, brand, address, active)
        └── profiles (id=auth.uid, display_name, email, brand, store_id, region_id, active)
              └── user_roles (user_id, role)  -- enum app_role: ba | store_manager | zone_supervisor | central_admin
```

- `profiles.store_id` y `profiles.region_id` opcionales (admin central no tiene tienda).
- Trigger `handle_new_user`: crea `profile` con metadata (`display_name`, `brand`, `store_id`) y rol default `ba`.

### 3.2 Consumidores y consentimiento (RF-09, RF-12, RF-13, RF-15, RNF-04)

```text
consumers (id, brand, first_name, last_name, email, phone, doc_id, birthday,
           gender, city, segment, lifetime_value, store_id, owner_ba_id, created_at, deleted_at)
consumer_consents (id, consumer_id, channel [whatsapp|email|sms], granted, granted_at, revoked_at, source)
consumer_preferences (id, consumer_id, key [skin_type|undertone|fragrance_family|...], value)
consumer_tags (consumer_id, tag)  -- VIP, alérgico, etc.
```

- `owner_ba_id` permite el scope "Self" del BA.
- `doc_id` único por marca (índice parcial `WHERE deleted_at IS NULL`).
- RLS: BA ve si `owner_ba_id = auth.uid()` o `store_id` coincide con su tienda; Store Manager ve su tienda; Supervisor su región; Admin todo.

### 3.3 Catálogo de producto (RF-14, RF-22)

```text
products (id, brand, sku UNIQUE, ean, name, category, subcategory, family, price, active, image_url, attributes JSONB)
product_recommendations (id, product_id, recommended_product_id, reason, weight)
```

- `attributes` JSONB para skin_type, fragrance notes, etc. (búsqueda por GIN index).
- Carga inicial vía CSV → bucket `catalog` + edge function de import.

### 3.4 Compras y tickets (RF-19, RF-20, RF-21)

```text
purchases (id, consumer_id, ba_id, store_id, brand, total, currency, purchased_at,
           ticket_number, source [pos|manual|scan], notes, deleted_at)
purchase_items (id, purchase_id, product_id, sku_snapshot, name_snapshot, qty, unit_price, discount)
tickets (id, purchase_id, storage_path, ocr_text, uploaded_by, uploaded_at)  -- bucket privado
```

- `sku_snapshot` para sobrevivir cambios de catálogo.
- Storage bucket `tickets` privado, RLS por `purchase.store_id`.

### 3.5 Muestras (RF-24, RF-25)

```text
samples (id, brand, sku, name, stock_per_store JSONB)  -- o tabla store_sample_stock
store_sample_stock (store_id, sample_id, qty)
sample_deliveries (id, consumer_id, sample_id, ba_id, store_id, delivered_at, notes,
                   converted_purchase_id NULL)  -- conversión muestra→compra
```

### 3.6 Agenda (RF-26..29)

```text
appointments (id, consumer_id, ba_id, store_id, brand, scheduled_at, duration_min,
              type [makeover|consulta|follow_up|evento], status [pending|confirmed|done|no_show|cancelled],
              notes, created_by)
appointment_reminders (id, appointment_id, channel, send_at, sent_at, status)
```

- Realtime para refrescar agenda en vivo.
- Índice `(ba_id, scheduled_at)` y `(store_id, scheduled_at)`.

### 3.7 Seguimiento post-venta (RF-31, RF-34)

```text
follow_up_templates (id, brand, name, trigger [post_purchase|birthday|inactivity|sample],
                     days_offset, channel, body_template)
follow_ups (id, consumer_id, ba_id, template_id, due_at, completed_at,
            channel, outcome [contacted|no_answer|opted_out|converted], notes,
            related_purchase_id NULL, related_sample_id NULL)
```

### 3.8 Notificaciones (RF-35, RF-36)

```text
notifications (id, user_id, type, title, body, payload JSONB, read_at, created_at)
notification_prefs (user_id, channel, enabled)
```

- Realtime por `user_id`.

### 3.9 Performance, metas y KPIs (RF-38..45, RF-48)

```text
goals (id, brand, scope [ba|store|region], scope_id, period_start, period_end,
       metric [sales|tickets|conversion|new_consumers|samples_converted], target_value)
goal_assignments (goal_id, user_id NULL, store_id NULL, region_id NULL)

-- Vistas materializadas (refresh diario)
mv_kpi_ba_daily   (ba_id, date, sales, tickets, avg_ticket, new_consumers, follow_ups_done)
mv_kpi_store_daily(store_id, date, ...)
mv_kpi_region_daily(region_id, date, ...)
```

- Dashboard consume vistas; edge function `refresh_kpis` programable.

### 3.10 WhatsApp (RNF-11 — estructura lista, sin envío real aún)

```text
whatsapp_templates (id, brand, code [birthday|post_purchase|appointment_reminder|...],
                    language, body, variables JSONB, approved)
whatsapp_messages (id, consumer_id, template_id, rendered_body, status [queued|sent|failed|stub],
                   sent_by, sent_at, external_id NULL)
```

- Hoy se inserta con `status='stub'` (clipboard). Cuando se conecte API: edge function `send-whatsapp` cambia a `queued/sent`.

### 3.11 Auditoría y eventos (RNF-13..15)

```text
audit_log (id, actor_id, action, entity, entity_id, before JSONB, after JSONB, ip, user_agent, created_at)
event_log (id, user_id, event_type, payload JSONB, created_at)  -- analítica
```

- Triggers `AFTER INSERT/UPDATE/DELETE` en `consumers`, `purchases`, `appointments`, `user_roles`, `goals`.

### 3.12 Catálogos auxiliares

```text
reasons (id, type [no_show|cancellation|opt_out|return], label, brand)
segments (id, code, name, brand)
```

---

## 4. Enums

- `app_role`: `ba`, `store_manager`, `zone_supervisor`, `central_admin`
- `brand`: `lancome`, `ysl`
- `appointment_status`, `appointment_type`
- `follow_up_outcome`, `follow_up_trigger`
- `purchase_source`
- `notification_channel`: `inapp`, `email`, `whatsapp`, `sms`
- `whatsapp_status`

---

## 5. RLS — patrón por scope

Función central:

```sql
has_role(_user_id uuid, _role app_role) RETURNS boolean  -- ya existe
user_store(_user_id uuid) RETURNS text                    -- nueva
user_region(_user_id uuid) RETURNS text                   -- nueva
```

Patrón aplicado a `consumers`, `purchases`, `appointments`, `follow_ups`, `sample_deliveries`:

```sql
USING (
  has_role(auth.uid(),'central_admin')
  OR (has_role(auth.uid(),'zone_supervisor') AND store_id IN (SELECT id FROM stores WHERE region_id = user_region(auth.uid())))
  OR (has_role(auth.uid(),'store_manager')   AND store_id = user_store(auth.uid()))
  OR (has_role(auth.uid(),'ba')              AND ba_id = auth.uid())
)
```

INSERT/UPDATE: BA solo crea con `ba_id = auth.uid()`. Catálogos (`products`, `templates`, `goals`) solo `central_admin` escribe; lectura abierta a autenticados.

---

## 6. Storage buckets

| Bucket | Privado | Uso | Política |
|---|---|---|---|
| `tickets` | sí | Fotos de tickets de compra | path `store_id/purchase_id/...`, lectura por scope de tienda |
| `consumer_avatars` | sí | Foto consumidor (opcional) | path `consumer_id/...` |
| `catalog` | sí | CSV de carga de productos | solo `central_admin` |
| `whatsapp_assets` | sí | Imágenes de plantillas | lectura autenticados |

---

## 7. Edge Functions previstas (no se implementan aún)

- `import-catalog` (CSV → `products`)
- `refresh-kpis` (refresca vistas materializadas)
- `send-whatsapp` (placeholder; hoy es stub clipboard)
- `export-report` (genera CSV/PDF y devuelve signed URL)
- `daily-followups-generator` (crea `follow_ups` desde templates por trigger)

---

## 8. Índices clave

- `consumers (brand, store_id)`, `consumers (owner_ba_id)`, GIN sobre `tsvector(first_name, last_name, email, phone)` para RF-09.
- `purchases (consumer_id, purchased_at DESC)`, `(store_id, purchased_at)`, `(ba_id, purchased_at)`.
- `appointments (ba_id, scheduled_at)`, `(store_id, scheduled_at)`.
- `products (brand, sku)` UNIQUE, `(brand, ean)`, GIN sobre `attributes`.
- `follow_ups (ba_id, due_at)` parcial `WHERE completed_at IS NULL`.

---

## 9. Migraciones (orden de ejecución)

1. Enums + `regions`, `stores`.
2. `profiles` (alterar la actual: añadir `region_id`), `user_roles` (ya existe), helpers `user_store`, `user_region`.
3. Catálogo: `products`, `product_recommendations`, `samples`, `store_sample_stock`.
4. Consumidores: `consumers`, `consumer_consents`, `consumer_preferences`, `consumer_tags`.
5. Transaccional: `purchases`, `purchase_items`, `tickets`, `sample_deliveries`.
6. Engagement: `appointments`, `appointment_reminders`, `follow_up_templates`, `follow_ups`.
7. Comms: `notifications`, `notification_prefs`, `whatsapp_templates`, `whatsapp_messages`.
8. Performance: `goals`, `goal_assignments`, vistas materializadas.
9. Auditoría: `audit_log`, `event_log` + triggers.
10. Storage buckets + policies.
11. Seed mínimo: regiones, tiendas demo, 1 admin, productos demo (50 SKUs por marca), templates WhatsApp.

---

## 10. Cobertura de requerimientos (checklist)

- Obligatorios highlight amarillo (46): cubiertos por tablas y vistas listadas.
- Obligatorios sin highlight (RF-14, 32, 49, 50–55): auth real + RLS + audit_log + roles → ya en el plan.
- Deseables verdes (10): incluidos (`product_recommendations`, `goals`, `whatsapp_*` estructura, vistas KPI, `consumer_consents`, `audit_log`, `notifications`, `follow_up_templates`, `samples` conversión, exports).
- Deseables amarillos (RF-08, 10, 46, 60, RNF-09, 10): NO se modelan (tu instrucción).
- Eliminados (RF-18, 37, 58, RNF-12, 16): no aparecen.
- RI-01..11: documentación, fuera del esquema.

---

## 11. Qué necesito de ti antes de migrar

1. ¿Confirmas los 4 roles tal cual (`ba`, `store_manager`, `zone_supervisor`, `central_admin`) o agregamos `trainer`/`marketing`?
2. ¿`brand` es excluyente por usuario (un BA = una marca) o un BA puede operar Lancôme y YSL?
3. ¿Las tiendas son compartidas entre marcas (mismo `store` con dos counters) o cada counter es una `store` distinta?
4. ¿OK con soft delete (`deleted_at`) en consumidores y compras, o prefieres hard delete con archivo en `audit_log`?

Cuando confirmes esos 4 puntos, ejecuto las migraciones en el orden de la sección 9 y luego cableo el front a las nuevas tablas.
