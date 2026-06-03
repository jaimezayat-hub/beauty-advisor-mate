
## Objetivo

Que **Reportes** y **Mi Desempeño** sean completamente dinámicos (filtros que recalculan todo), interactivos (drill-down, gráficas vivas) y cubran los requisitos RF-38 a RF-48 que ya están iniciados, completando lo faltante y exportando todo a CSV.

---

## Cobertura de requisitos

**Verde — Deseables que SÍ entran al alcance:**
- **RF-46** Tasas de conversión: recomendación → compra · seguimiento → revisita.
- **RF-47** Dashboard de retención (ya parcial: lo completamos con tendencia y export).

**Amarillo — Deseables parqueados (no entran en esta iteración):**
- **RF-37** Atribución de ventas online por link tracking.
- **RF-16** Lógica predictiva de reposición.
- **RF-18** Lookbooks/rutinas compartibles.
- **RF-10** Enriquecimiento con e-commerce.

**Obligatorios con front ya iniciado (los completamos y los hacemos dinámicos):**
- **RF-38** Dashboard ejecutivo de tienda (KPIs: objetivo, avance $, % avance, sell-out, transacciones, registros, seguimientos).
- **RF-39** Métricas de citas: objetivo semanal, total, nuevas, reagendadas.
- **RF-40** Filtros: rango de fechas + tienda + región + cadena/marca + BA.
- **RF-41** Reporte de clientes exportable con todas las columnas, incluida **tipo de seguimiento**.
- **RF-42** Top Franquicias / Marcas y ventas por categoría (visual).
- **RF-43** Reporte de desempeño por BA: transacciones, registros, seguimientos, recomendaciones.
- **RF-44** Agenda Report exportable.
- **RF-45** Dashboard de adopción por BA / tienda / región.
- **RF-48** Exportación Excel/CSV en todos los reportes.

---

## Cambios en `src/pages/Reports.tsx`

### 1. Barra global de filtros (RF-40)
Reemplaza el toggle simple de rango. Sticky superior con:
- Rango de fechas con presets (Hoy, 7d, Mes, Trimestre, Año) **+ datepicker custom desde/hasta**.
- Marca (Lancôme / YSL / Todas).
- Cadena (Palacio / Liverpool / Todas).
- Región (autocompleta desde `regions`).
- Tienda (filtrada por cadena/región seleccionadas).
- BA (filtrado por tienda seleccionada).
- Botón "Limpiar filtros".

Todos los datos derivados (KPIs, gráficas, tablas, exports) se recalculan con `useMemo` cuando cambian los filtros. Respeta el `scope` del usuario (BA sólo se ve a sí mismo, gerente su tienda, supervisor su región, central todo).

### 2. Tab **Dashboard** (RF-38, RF-42)
- KPIs reales: Objetivo (de `goals` según scope+periodo), Avance $, % avance, Sell-out, Transacciones, Nuevos registros, Seguimientos, Ticket promedio. Sustituir `targetMx = 850000` hardcodeado.
- Gráfica **Top Tiendas** (barra horizontal por sell-out).
- Gráfica **Top Marcas** (barra apilada Lancôme vs YSL).
- Mix por categoría (ya existe) — se mantiene.
- Ventas por BA filtradas.
- Tendencia 8 semanas (ya existe).

### 3. Tab **Citas** (RF-39, RF-44) — nuevo
- KPIs: objetivo semanal, total citas, **nuevas**, **reagendadas**, completadas, canceladas, no-show.
- Tabla agenda exportable: nombre, apellido, teléfono, fecha, tipo de evento, BA, estado, comentarios.
- Botón "Exportar Agenda CSV".

### 4. Tab **Conversión** (RF-46) — nuevo
- KPI tasa recomendación → compra (cruce `recommendations` vs `purchases` posteriores).
- KPI tasa seguimiento → revisita (cruce `follow_ups` cerrados vs `visits` posteriores).
- KPI tasa visita → compra (cruce `visits` con `purchased=true`).
- Gráfica de embudo + tendencia por semana.

### 5. Tab **Lista Consumidores** (RF-41)
- Agregar columna **Tipo de seguimiento** (último `follow_up.type` por consumidor).
- Filtros heredan de la barra global.
- Export incluye todas las columnas requeridas.

### 6. Tab **Desempeño BA** (RF-43)
- Datos vivos por BA según filtros (no sólo `recommendations` del seed). Conecta con `useFollowUpsList`, `useVisits`, `usePurchases`, `useRecommendations`.
- Sparkline por BA + drill-down al click → abre modal con sus transacciones del periodo.
- Export CSV ampliado (incluye visitas y citas).

### 7. Tab **Adopción** (RF-45)
- Vistas conmutables: **por BA · por Tienda · por Región**.
- Métricas: % BAs activos, días activos promedio, eventos/día.
- Export CSV de adopción.

### 8. Tab **Retención** (RF-47)
- Ya existe el donut/buckets. Agregar:
  - Tendencia 12 semanas de churn.
  - Export CSV de candidatas a reactivación.

### 9. Exportación universal (RF-48)
- Botón "Exportar" en cada tab. Función `exportTab(tab)` central que aprovecha `downloadCSV`.

---

## Cambios en `src/pages/Performance.tsx` ("Mi Desempeño")

1. **Mostrar el panel personal a todos los roles** (no sólo BA). Para gerente/supervisor/admin, "Mi Desempeño" muestra el agregado del scope (su tienda, región o nacional). El TeamPanel pasa a ser un tab dentro de la página.
2. **Dejar de depender de `baKpis` mock** — todos los KPIs ya consumibles desde `usePerformanceKpis` extendido para devolver: ventas, transacciones, ticket, nuevos, seguimientos completados/pendientes, recomendaciones, conversión, citas (todas, nuevas, reagendadas, completadas, canceladas, noshow), visitas, días activos.
3. **Filtros locales sincronizados** con los mismos chips de Reportes (período + opcional store/BA para roles superiores).
4. Cards y gráficas se recalculan en vivo según los filtros.
5. Botón **Exportar mi desempeño** (CSV).

---

## Cambios en datos / hooks

- **`src/lib/db/usePerformance.ts`** — Extender `usePerformanceKpis` para aceptar `{ baId?, storeId?, region?, brand?, from, to }` y devolver el set completo de métricas mencionado arriba. Calcular reagendadas detectando `appointments` con `notes` que contenga `[reagendada]` o nuevo campo (si no existe, derivar de status histórico).
- **`src/lib/db/useGoals.ts`** (nuevo) — Hook para leer `goals` + `goal_assignments` según scope/periodo, devolver `targetValue` aplicable.
- **`src/lib/db/useRecommendations.ts`** o equivalente — Para tab Desempeño BA y Conversión (si no existe, agregar query simple a tabla relevante; si no hay tabla, computar desde notas/visit notes).
- **`src/lib/csv.ts`** — Ya existe. Reutilizar.

---

## Detalles técnicos

- Mantener convención de roles (`getScope` / `inScope`) — los filtros nunca permiten ver fuera del scope del usuario.
- Modo demo (`!isRealSession`): los filtros siguen funcionando sobre datos seed para que la demo sea realista.
- Toda gráfica usa tokens semánticos (`hsl(var(--primary))`, etc.) — sin colores hardcoded.
- `useMemo` agresivo para no recomputar al re-render; queries `enabled` cuando aplican.
- Sticky filter bar con `backdrop-blur` y `z-20`.

---

## Archivos a tocar

- `src/pages/Reports.tsx` (refactor mayor: barra de filtros + nuevos tabs)
- `src/pages/Performance.tsx` (panel personal para todos + filtros + export)
- `src/lib/db/usePerformance.ts` (extender)
- `src/lib/db/useGoals.ts` (nuevo)
- `src/components/clienteling/ReportFilters.tsx` (nuevo, componente reusable)

Sin cambios de esquema en DB — todo lo necesario ya existe (`goals`, `goal_assignments`, `appointments`, `visits`, `follow_ups`, `purchases`, `consumers`, `stores`, `regions`).
