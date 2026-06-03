# 🎬 Video Demo Launch — 2 min (Lancôme/YSL Clienteling AI)

## Garantía de aislamiento

Todo el trabajo vive en una carpeta nueva **`remotion/`** en la raíz del proyecto. **No se toca ningún archivo de tu app**: ni `src/`, ni `supabase/`, ni `public/`, ni `package.json`, ni rutas, ni base de datos, ni seed. Tu app sigue corriendo exactamente igual durante y después del render.

Si después quieres borrar el video del repo, basta con eliminar la carpeta `remotion/` — cero efectos colaterales.

## Dirección creativa

- **Estilo**: Luxury editorial cinematográfico (referencia: keynote Apple × campaña Lancôme Absolue)
- **Paleta**:
  - Negro profundo `#0A0A0A`
  - Crema papel `#F5F0E8`
  - Oro champagne `#C9A84C`
  - Rosa nude acento `#D4A5A5`
- **Tipografía**: Cormorant Garamond (display serif) + Inter (UI/body) — ambas vía `@remotion/google-fonts`
- **Motion system**:
  - Entradas: blur-to-sharp + spring suave (damping 25)
  - Transiciones entre fases: wipe horizontal + cross-fade de 20 frames
  - Movimiento constante: parallax sutil en fondos para que nada se sienta estático
- **Música**: ninguna en v1 (se puede agregar después si me pasas un MP3 royalty-free)
- **Voz**: texto on-screen estilo keynote (sin TTS en v1)

## Estructura de 9 escenas — 120 s @ 30fps = 3600 frames

| # | Escena | Duración | Beat visual |
|---|---|---|---|
| 0 | Cold open: logo + tagline *"El lujo también recuerda"* | 8s | Fundido oro sobre negro |
| 1 | Home BA — saludo + KPIs + alertas | 14s | Cards animadas en cascada |
| 2 | Consumidoras — lista + segmentos + onboarding | 16s | Stepper animado, firma aviso privacidad |
| 3 | Perfil 360° — piel, intereses, historial | 14s | Scroll vertical con parallax |
| 4 | Catálogo + Recomendaciones AI | 16s | Grid de productos, sparkle al sugerir |
| 5 | Compras + escaneo de ticket | 12s | Cámara → flash → ✅ |
| 6 | Agenda + Visitas + Seguimiento WhatsApp | 14s | Calendario + burbuja WhatsApp |
| 7 | Desempeño — ranking, sparkline, export | 14s | Números contando + gráfica trazándose |
| 8 | Cierre — tagline + disponibilidad Q3 2026 | 12s | Logo final fade |

Las pantallas son **mock-ups motion-graphics** recreados con divs/SVG (no screen recording de tu app real, pero visualmente consistentes con tu diseño actual: tipografía display, segment badges, paleta Lancôme).

## Arquitectura técnica

```text
remotion/
├── package.json              ← deps aisladas (no afecta tu package.json)
├── tsconfig.json
├── scripts/
│   └── render-remotion.mjs   ← script de render programático
├── src/
│   ├── index.ts
│   ├── Root.tsx              ← <Composition id="main" 1920x1080 30fps 3600f>
│   ├── MainVideo.tsx         ← TransitionSeries con las 9 escenas
│   ├── components/
│   │   ├── PersistentBg.tsx        ← gradiente animado de fondo
│   │   ├── MockPhone.tsx           ← marco de dispositivo reusable
│   │   ├── MockCard.tsx            ← cards estilo tu app
│   │   └── SegmentBadge.tsx        ← réplica visual de tu badge
│   └── scenes/
│       ├── Scene0_Open.tsx
│       ├── Scene1_Home.tsx
│       ├── Scene2_Consumers.tsx
│       ├── Scene3_Profile.tsx
│       ├── Scene4_Catalog.tsx
│       ├── Scene5_Purchases.tsx
│       ├── Scene6_Agenda.tsx
│       ├── Scene7_Performance.tsx
│       └── Scene8_Close.tsx
└── public/
    └── (sin assets externos en v1; todo dibujado en código)
```

**Output**: `/mnt/documents/clienteling-demo-launch.mp4` (~25–40 MB)

## ⚠️ Riesgo de timeout en render

El sandbox limita cada comando a **600 segundos (10 min)**. Renderizar 3600 frames a 1920×1080 con `concurrency: 1` podría tardar 8–12 min. Para mitigar:

1. **Plan A** — Render directo a 1920×1080. Si pasa en <10 min, listo.
2. **Plan B (fallback)** — Si excede timeout, divido en 3 lotes (escenas 0-2, 3-5, 6-8), renderizo cada uno, y los concateno con `ffmpeg` (ya está pre-instalado). Tiempo total similar pero cada comando entra debajo del límite.
3. **Plan C** — Render a 1280×720 (más rápido) y luego upscale. No recomendado para uso final.

Empiezo con Plan A; si falla, automáticamente paso a Plan B.

## Pasos de ejecución (al pasar a build)

1. Crear `remotion/` y `bun init` aislado
2. Instalar Remotion + dependencias (solo dentro de `remotion/`)
3. Parchar binario compositor para NixOS (paso estándar del sandbox)
4. Cargar fuentes Google
5. Escribir los 9 componentes de escena
6. Spot-check con `bunx remotion still` en 3 frames clave para validar layout antes del render completo
7. Render Plan A → si timeout, Plan B
8. Entregar el MP4 con tag `<presentation-artifact>` para descarga directa

## Lo que NO va a pasar

- ❌ No se modifica ningún archivo bajo `src/`
- ❌ No se toca Supabase, migraciones, ni seed
- ❌ No se cambia tu `package.json` ni `bun.lockb` de la app
- ❌ No se altera ninguna ruta, página o componente del clienteling
- ❌ No se reinicia tu dev server

¿Apruebas el plan para que arranque el render?
