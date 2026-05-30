## Objetivo

Hoy existe **Agenda** (programar citas futuras) pero falta poder **registrar una visita ya ocurrida** y que quede en el historial de la consumidora. La tabla `visits` y `visit_reasons` ya están creadas en el backend pero sin UI.

## Alcance

1. **Nueva entrada en el menú lateral**: "Registrar visita" (icono `UserCheck`), ruta `/visitas`. Visible para BA y gerentes (no admin/zona).
2. **Página `/visitas`** con dos secciones:
   - **Formulario de registro**: ConsumerPicker + fecha/hora (default: ahora) + motivo (chips desde `visit_reasons`) + duración en minutos + notas + (opcional) vincular con una cita existente del día.
   - **Listado reciente**: últimas visitas registradas por el BA / tienda (según rol), con consumidor, motivo, fecha y duración.
3. **Persistencia real** en la tabla `visits` (ya tiene RLS por scope BA/tienda/zona).
4. **Historial en el perfil de la consumidora**: las visitas registradas aparecen en el timeline de `ConsumerProfile` junto a compras, citas y mensajes.
5. **Atajo contextual**: botón "Registrar visita" en `ConsumerProfile` que abre el formulario con la consumidora pre-seleccionada (`/visitas?consumerId=…`).

## Detalles técnicos

- **Hook nuevo** `src/lib/db/useVisits.ts`:
  - `useVisitReasonsList()` — lee `visit_reasons` activos.
  - `useVisitsList({ scope, baId, storeId })` — lista visitas filtradas, JOIN con `visit_reasons` y `consumers` (nombre).
  - `useConsumerVisits(consumerId)` — visitas de una consumidora (para el timeline).
  - `useCreateVisit()` — inserta en `visits` con `brand`, `store_id`, `ba_id` desde el perfil del usuario; invalida `["visits"]` y `["consumer-timeline", consumerId]`.
- **Tipo nuevo** `Visit` en `src/lib/types.ts`: `{ id, consumerId, baId, storeId, brand, visitedAt, durationMin?, reasonId?, reasonName?, appointmentId?, notes? }`.
- **Mapper** en `src/lib/db/mappers.ts`: `mapVisit(row, reason?)`.
- **Página nueva** `src/pages/Visits.tsx` con el formulario + lista reciente. Reusa `ConsumerPicker`, `PageHeader`, `Card`, `Input`, `Textarea`, chips para motivos, `Calendar` shadcn para fecha.
- **Sidebar** (`AppShell.tsx`): añadir entrada justo después de "Agenda" con icono `UserCheck` y permitirla en `canAccessRoute` para BA y gerentes.
- **Ruta** en `App.tsx`: `/visitas` → `Visits`.
- **Timeline** (`useConsumers.ts`): extender `useConsumerTimeline` para traer `visits` (con join a `visit_reasons`) y devolver `visits: Visit[]`.
- **ConsumerProfile**: agregar sección "Visitas registradas" en el timeline + botón "Registrar visita" en el header del perfil.

## Permisos / RLS

La tabla `visits` ya tiene:
- INSERT: BA sobre sí mismo en su tienda, store manager en su tienda, central admin.
- SELECT/UPDATE: por `can_access_scope(store_id, ba_id)`.

No requiere migración.

## Fuera de alcance

- Editar/eliminar visitas (sólo registrar y consultar en esta iteración).
- Métricas de visitas en Desempeño/Reportes (se puede sumar después).
- Convertir visita en venta directamente (ya existe el flujo de Compras).
