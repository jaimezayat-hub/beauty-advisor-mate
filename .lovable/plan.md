## Objetivo
Restringir las pestañas del menú según rol, alineado con RF-50 a RF-54 del documento de requerimientos.

## Matriz de visibilidad propuesta

| Pestaña | BA | Gerente tienda | Supervisor zona | Admin Central |
|---|---|---|---|---|
| Inicio | ✓ | ✓ | ✓ | ✓ |
| Consumidoras | ✓ | ✓ | ✓ | ✓ |
| Recomendaciones | ✓ | — | — | ✓ |
| Compras | ✓ | ✓ | ✓ | ✓ |
| Agenda | ✓ | ✓ | ✓ | ✓ |
| Seguimiento | ✓ | — | — | ✓ |
| Mi Desempeño / Desempeño Equipo | ✓ (propio) | ✓ (tienda) | ✓ (zona) | ✓ (nacional) |
| Reportes | — | ✓ | ✓ | ✓ |
| Configuración | — | — | — | ✓ |

Racional:
- **RF-51** BA: operativo de su tienda → mantiene Recomendaciones y Seguimiento, sin Reportes ni Config.
- **RF-52** Gerente: foco supervisión/reportes/adopción → quita Recomendaciones y Seguimiento (tareas de BA).
- **RF-53** Supervisor: visualiza múltiples tiendas → mismo set que Gerente (sin tareas de BA).
- **RF-54** Admin Central: todo, incluida Configuración.

## Cambios técnicos
1. **`src/lib/permissions.ts` → `canAccessRoute`**: ampliar para cubrir `/recomendaciones` y `/seguimiento` (ocultas a gerente y supervisor, visibles para BA y admin). Mantener regla actual de `/reportes` (oculto solo a BA) y `/configuracion` (solo admin).
2. **`src/App.tsx`**: añadir guardia equivalente en las rutas afectadas, redirigiendo a `/` si el rol no tiene acceso (defensa por URL directa).
3. **`src/components/layout/AppShell.tsx`**: ya filtra el `NAV` con `canAccessRoute`, no requiere cambios.
4. **Verificación**: probar con los 4 perfiles del selector demo en `Login` para confirmar que cada rol ve solo las pestañas correspondientes.

## Fuera de alcance
- No se tocan permisos de datos en Supabase (las RLS ya restringen por scope vía `can_access_scope`).
- No se modifica el contenido interno de cada página.