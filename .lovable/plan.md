## Fase C — Conectar UI a Supabase

### Realidad del código actual
- **6,132 líneas** en `src/pages/*` + 130 en `useApp.ts` + 876 en `seed.ts`.
- Toda la app lee de **Zustand (`useApp`) hidratado con `SEED_*`**.
- Tipos del store usan **camelCase** (`firstName`, `storeId`, `assignedBaId`) — los de Supabase usan **snake_case** (`first_name`, `store_id`, `owner_ba_id`).
- DB tiene: 11 consumers, 5 purchases, 4 appts, 151 stores, 12 regions, 34 products. **0** follow_ups, **0** samples, **0** templates.

### Estrategia recomendada: capa de mapeo + hooks

En lugar de reescribir las 6k líneas, crear una **capa fina de data-access** que mantenga los nombres camelCase que ya usan los componentes:

```
src/lib/db/
  ├── mappers.ts        # snake_case (DB) ↔ camelCase (UI)
  ├── useConsumers.ts   # query+mutate consumers
  ├── usePurchases.ts
  ├── useAppointments.ts
  ├── useFollowUps.ts
  ├── useProducts.ts
  ├── useSamples.ts
  ├── useVisits.ts
  ├── useGoals.ts
  └── usePerformance.ts # agrega de views v_kpi_*
```

Cada hook usa **React Query** (`@tanstack/react-query` ya instalado) → `select` desde Supabase → `map` a tipos UI existentes. Las mutaciones invalidan keys.

### Cambios por página

| Página | Fuente actual | Acción |
|---|---|---|
| Consumers | `useApp.consumers` | sustituir por `useConsumers()` con filtros server-side |
| ConsumerProfile | `useApp.consumers/purchases/appointments` | `useConsumer(id)` + queries relacionadas |
| NewConsumer | `addConsumer` (Zustand) | `useCreateConsumer()` → INSERT + `notice_acceptances` + `consumer_consents` |
| Purchases | `useApp.purchases` | `usePurchases()` + `useCreatePurchase()` (purchase+items+ticket upload) |
| Agenda | `useApp.appointments` | `useAppointments()` + realtime + create/update |
| FollowUp | `useApp.followUps` | `useFollowUps()` + outcome update; seed mínimo de `follow_up_templates` |
| Recommendations | `useApp.recommendations` + products | `useProducts()` + `useProductRecommendations(productId)` |
| Performance | `useApp.baKpis` (calculadas en memoria) | `usePerformance()` desde `v_kpi_*` views |
| Settings | demo | listar `profiles/user_roles/stores/regions` admin-only |
| Reports | demo | export CSV desde queries reales |

### Datos mínimos a sembrar
- 6 `follow_up_templates` (post-compra, post-muestra, cumpleaños, reactivación, recordatorio cita, agradecimiento).
- 8 `samples` por marca con stock en stores demo.
- 1 `privacy_notice` vigente por marca.

### Compatibilidad demo
- Mantengo `useApp` para `currentUser`, `activeBrand`, modo demo de usuarios seed.
- Hooks devuelven datos reales **solo si hay sesión Supabase**; si no, fallback a seed (para no romper demo).

### Detalles técnicos
- `notice_acceptances` se inserta en `NewConsumer` con `version` desde `privacy_notices` activo.
- `purchases` con `ticket` requiere upload a bucket `tickets` → `storage_path`.
- Filtros server-side: `ilike` para búsqueda, `eq` para segmento; RLS ya restringe scope por rol.
- Performance: queries paralelas con `Promise.all` en hooks compuestos.
- Realtime: `useAppointments`, `useFollowUps`, `useVisits`, `useNotifications` se suscriben con `supabase.channel().on('postgres_changes')` + invalidan React Query.

### Ejecución sugerida (4 sub-fases)
1. **C1 — Cimientos**: `mappers.ts`, semillas mínimas (templates/samples/notices), `useConsumers/useProducts/useStores` + migrar **Consumers + NewConsumer + ConsumerProfile (read)**.
2. **C2 — Transacciones**: `usePurchases` + Purchases page + upload ticket; `useAppointments` + Agenda + realtime.
3. **C3 — Engagement**: `useFollowUps` + FollowUp page; `useSamples` + sample_deliveries; Recommendations conectado a `products` reales.
4. **C4 — Análisis & Admin**: `usePerformance` desde views, Performance page; Settings real con profiles/roles/stores; Reports con export.

### Riesgo
Tocar las 7 páginas + ConsumerProfile (647 líneas) en **una sola respuesta** es propenso a romper UI. Recomiendo ejecutar **C1 ahora** y, tras validar, seguir con C2→C4.

### Pregunta
¿Apruebas este enfoque y empiezo por **C1** (cimientos + Consumers + NewConsumer + ConsumerProfile read-only)?
