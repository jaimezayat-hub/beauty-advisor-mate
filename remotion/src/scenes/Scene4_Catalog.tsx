import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body, displayItalic } from "../theme";
import { PersistentBg, Eyebrow, RevealText, DeviceFrame } from "../components/Primitives";

const PRODUCTS = [
  { name: "Génifique Sérum", cat: "Skincare", price: "$3,490", hue: 45 },
  { name: "Absolue Soft Cream", cat: "Skincare", price: "$5,290", hue: 25 },
  { name: "Teint Idole 24H", cat: "Makeup", price: "$1,180", hue: 15 },
  { name: "La Vie Est Belle EDP", cat: "Fragancia", price: "$3,950", hue: 350 },
  { name: "Rénergie H.P.N.", cat: "Skincare", price: "$4,690", hue: 35 },
  { name: "Hypnôse Mascara", cat: "Makeup", price: "$890", hue: 0 },
  { name: "Idôle EDP", cat: "Fragancia", price: "$2,890", hue: 320 },
  { name: "L'Absolu Rouge", cat: "Makeup", price: "$1,090", hue: 355 },
];

const ProductCard: React.FC<{ p: (typeof PRODUCTS)[number]; delay: number; highlight?: boolean; sparkle?: number }> = ({
  p,
  delay,
  highlight,
  sparkle = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const glow = highlight ? interpolate(sparkle, [0, 0.5, 1], [0, 0.9, 0.6]) : 0;
  return (
    <div
      style={{
        background: C.cream,
        borderRadius: 14,
        overflow: "hidden",
        opacity: s,
        transform: `translateY(${y}px)`,
        boxShadow: highlight
          ? `0 0 0 2px ${C.gold}, 0 0 40px rgba(201,168,76,${glow})`
          : "0 4px 16px rgba(0,0,0,0.06)",
        position: "relative",
      }}
    >
      <div
        style={{
          height: 130,
          background: `linear-gradient(135deg, hsl(${p.hue}, 35%, 85%), hsl(${p.hue}, 50%, 70%))`,
          position: "relative",
        }}
      >
        {/* Bottle silhouette */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 38,
            height: 70,
            background: `linear-gradient(180deg, hsl(${p.hue}, 60%, 45%), hsl(${p.hue}, 70%, 30%))`,
            borderRadius: "6px 6px 4px 4px",
            boxShadow: "0 6px 12px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 16,
              height: 10,
              background: C.gold,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontFamily: body, fontSize: 9, letterSpacing: "0.2em", color: C.muted, textTransform: "uppercase" }}>
          {p.cat}
        </div>
        <div style={{ fontFamily: display, fontSize: 16, color: C.ink, marginTop: 4, fontWeight: 500 }}>{p.name}</div>
        <div style={{ fontFamily: display, fontSize: 18, color: C.gold, marginTop: 6 }}>{p.price}</div>
      </div>
      {highlight && sparkle > 0 && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: C.gold,
            color: C.ink,
            fontFamily: body,
            fontSize: 9,
            letterSpacing: "0.15em",
            padding: "4px 8px",
            borderRadius: 999,
            textTransform: "uppercase",
            fontWeight: 700,
            opacity: sparkle,
          }}
        >
          ✦ IA
        </div>
      )}
    </div>
  );
};

export const Scene4_Catalog: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Recommendation panel appears mid-scene
  const recIn = spring({ frame: frame - 280, fps, config: { damping: 22 } });
  const sparkle = interpolate(frame, [300, 360, 440, 480], [0, 1, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = Math.sin(frame / 60) * 3;
  const recommended = [0, 4, 7]; // génifique, rénergie, l'absolu

  return (
    <AbsoluteFill>
      <PersistentBg tone="light" />
      <AbsoluteFill style={{ flexDirection: "column", padding: 70, gap: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Eyebrow text="Fase 04 · Catálogo + IA" color={C.ink} delay={0} />
            <RevealText text="Tres productos perfectos," fontSize={64} delay={6} color={C.ink} />
            <RevealText text="elegidos por la IA." fontSize={64} delay={16} color={C.rose} family={displayItalic} italic />
          </div>
          <div style={{ maxWidth: 380, paddingBottom: 12 }}>
            <RevealText
              text="Basados en su piel, sus compras y la temporada. Con ficha técnica y argumentario aprobados por la maison."
              fontSize={16}
              delay={50}
              color={C.ink}
              family={body}
              weight={300}
              lineHeight={1.5}
              letterSpacing="0em"
            />
          </div>
        </div>

        <div style={{ flex: 1, transform: `translateY(${drift}px)`, position: "relative" }}>
          <DeviceFrame width={1280} height={540}>
            <div
              style={{
                padding: 24,
                height: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "repeat(2, 1fr)",
                gap: 14,
              }}
            >
              {PRODUCTS.map((p, i) => (
                <ProductCard
                  key={p.name}
                  p={p}
                  delay={70 + i * 14}
                  highlight={recommended.includes(i)}
                  sparkle={sparkle}
                />
              ))}
            </div>

            {/* Recommendation banner */}
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: 24,
                right: 24,
                background: C.ink,
                color: C.cream,
                borderRadius: 12,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: recIn,
                transform: `translateY(${interpolate(recIn, [0, 1], [20, 0])}px)`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  letterSpacing: "0.3em",
                  color: C.gold,
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                ✦ Sugerencia IA para Mariana
              </div>
              <div style={{ flex: 1, fontFamily: display, fontSize: 18 }}>
                3 productos · Skincare anti-edad + ritual de mañana
              </div>
              <div style={{ fontFamily: body, fontSize: 13, color: C.gold }}>$9,270 MXN</div>
            </div>
          </DeviceFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};