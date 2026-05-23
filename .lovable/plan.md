## Resumen de tu pregunta

**1) "Reporte Gerente — Tabla comparativa de BAs": ya lo tienes.**
Está en `/reportes` → pestaña **"Desempeño BA"** (`Reports.tsx`, tab `ba`). Es una tabla con BA / Marca / Transacciones / Total MXN / Nuevos / Seguimientos / Recomendaciones / Adopción (semáforo Alta/Media/Baja) + botón de exportar a CSV. ✅ No hay que volver a construirla.

**2) Los filtros de período no mueven datos: bug confirmado.**
Encontré dos causas distintas:

- En **`/desempeño` (Mi Desempeño)**: el `useState("Este mes")` solo se usa para mostrar el chip en el hero. Los KPIs vienen de `usePerformanceKpis()` que está hardcoded a `startOfMonthISO()` (inicio del mes actual). Cambiar "Esta semana / Este mes / Últimos 3 meses" no recalcula nada.
- En **`/reportes`**: los chips Hoy/Semana/Mes/Trimestre **sí filtran client-side**, pero la base tiene poca distribución temporal (todas las compras caen entre nov‑2025 y may‑2026, las citas y follow‑ups arrancan en mar‑2026), así que "Hoy" suele dar 0 y "Mes/Trimestre" se ven casi iguales → da la sensación de que no se mueven.

**3) Llenar la base con datos suficientes** para que los filtros muestren variación real.

---

## Plan

### A. Arreglar el filtro de período en `/desempeño`
Archivo: `src/pages/Performance.tsx` + `src/lib/db/usePerformance.ts`.

1. Cambiar `usePerformanceKpis(enabled)` a `usePerformanceKpis(enabled, period)` que reciba `"semana" | "mes" | "trimestre"` y elija qué vistas/fechas usar:
   - `semana` → sumar los últimos 7 días desde `purchases`, `consumers`, `follow_ups`, `appointments`, `sample_deliveries` directos (las vistas mensuales no sirven para semana).
   - `mes` → seguir usando las vistas `v_*_by_ba_month` con el mes actual.
   - `trimestre` → sumar los últimos 3 meses de las mismas vistas.
2. En `Performance.tsx`, mapear el string visible (`"Esta semana"`, etc.) a la clave y pasarla al hook. Re-render automático vía React Query (key incluye el período).
3. Quitar "Personalizado" por ahora (o dejarlo deshabilitado) para no prometer lo que no entrega.

### B. Asegurar que `/reportes` reaccione visiblemente
Archivo: `src/pages/Reports.tsx`.

1. El filtrado client-side ya está correcto. Sólo añadir un indicador "Mostrando X transacciones del período seleccionado" arriba de los KPIs para que sea evidente que el chip cambió algo.
2. Mantener el cap de 500 filas del query (suficiente con el seed extendido).

### C. Sembrar la base con datos realistas (vía migración con `INSERT`)
Una sola migración que añada datos sin tocar lo existente:

- **Tiendas y regiones**: si faltan, garantizar 4–6 tiendas en 2–3 regiones.
- **Profiles + user_roles**: 6–8 BAs sintéticos distribuidos entre tiendas (sólo `profiles`, no `auth.users` — usaremos los `owner_ba_id` ya presentes en consumers para mantener compatibilidad con RLS de lectura).
- **Consumers**: subir a ~150 total, con `created_at` distribuido en los últimos 9 meses.
- **Purchases + purchase_items**: ~600 compras con `purchased_at` distribuido día por día desde hace 120 días (incluyendo varias de "hoy" y de "esta semana") para que cada chip Hoy/Semana/Mes/Trimestre dé un número distinto.
- **Appointments**: ~120, con mezcla de pasadas (completadas/canceladas/no-show) y futuras (próximas 4 semanas), distribuidas día a día.
- **Follow_ups**: ~200, mezcla de `pending` y `completado`, con `due_at` y `completed_at` distribuidos.
- **Sample_deliveries**: ~80 con `delivered_at` últimos 90 días, ~20 con `converted_purchase_id` apuntando a una compra existente.
- **Goals + goal_assignments**: una meta de venta mensual por BA y una a nivel tienda para que el "Avance a objetivo" tenga referencia real.

Toda la siembra usa `gen_random_uuid()` + `INSERT … SELECT` con `generate_series` para distribuir fechas. Idempotente: condicionada a `NOT EXISTS` por (consumer + fecha) o tag de fuente.

### D. Verificación
1. Abrir `/reportes`: clic en Hoy → Semana → Mes → Trimestre, los seis KPIs cambian.
2. Abrir `/desempeño`: clic en Esta semana → Este mes → Últimos 3 meses, "Total vendido" y "Transacciones" cambian.
3. Abrir tab "Desempeño BA" en `/reportes`: confirmar que cada BA tiene número distinto y el semáforo de Adopción muestra los tres colores.

---

## Detalle técnico clave

```text
usePerformanceKpis(enabled, period)
  ├─ semana   → SELECT sum(...) FROM purchases WHERE purchased_at >= now() - 7d
  ├─ mes      → v_sales_by_ba_month (mes en curso)  ← actual comportamiento
  └─ trimestre→ v_sales_by_ba_month WHERE month >= date_trunc('month', now()) - 2 months
```

Migración de siembra: ~6 `INSERT … SELECT generate_series(0, N) i` con `now() - (i || ' days')::interval` para spread temporal; `random()` para mezclar BAs, tiendas y totales realistas (1 200 – 8 500 MXN por compra).

¿Quieres que también añada el filtro "Personalizado" con date-range picker, o lo dejo para después?