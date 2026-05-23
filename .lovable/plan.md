# Ajuste de matriz de visibilidad

Hoy estas secciones son operativas del BA, pero Admin, Supervisor de Zona y Gerente las ven (o algunas). Las vamos a limitar para que **solo el BA** las use. Admin/Zona/Gerente siguen viendo la lista de consumidoras (solo lectura para reportar), pero pierden la acción de crear.

## Cambios por rol

| Sección | BA | Gerente | Zona | Admin |
|---|---|---|---|---|
| Agenda | ✅ | ❌ | ❌ | ❌ |
| Seguimiento | ✅ | ❌ | ❌ | ❌ |
| Recomendaciones | ✅ | ❌ | ❌ | ❌ |
| Consumidoras (ver lista/perfil) | ✅ | ✅ | ✅ | ✅ |
| Consumidoras → **Agregar nueva** | ✅ | ❌ | ❌ | ❌ |

Nota: hoy Admin sí tiene acceso a Recomendaciones y Seguimiento; con este cambio se le quita.

## Implementación

1. **`src/lib/permissions.ts` → `canAccessRoute`**
   - `/recomendaciones`, `/seguimiento`, `/agenda` → solo `role === "ba"`.
   - `/consumidoras/nueva` → solo `role === "ba"`.
   - `/consumidoras` y `/consumidoras/:id` → sin cambio (todos los roles).

2. **Navegación lateral (`src/components/Layout*` / sidebar)**
   - Ocultar items Agenda, Seguimiento y Recomendaciones para roles distintos de BA usando `canAccessRoute`.

3. **Página Consumidoras (`src/pages/Consumers.tsx`)**
   - Ocultar el botón "Agregar / Nueva consumidora" si el rol no es BA.

4. **Guard de ruta**
   - Si un usuario no-BA entra por URL directa a `/agenda`, `/seguimiento`, `/recomendaciones` o `/consumidoras/nueva`, redirigir a `/` (ya lo hace `canAccessRoute` vía el wrapper de rutas; verificar).

## Fuera de alcance

- No tocamos RLS de Supabase (los datos siguen siendo visibles por scope para reportes).
- No cambiamos Reportes ni Configuración.

¿Confirmas y lo implemento?
