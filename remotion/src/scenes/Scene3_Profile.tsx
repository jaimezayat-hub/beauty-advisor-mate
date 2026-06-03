import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body, displayItalic } from "../theme";
import { PersistentBg, Eyebrow, RevealText, DeviceFrame, Avatar, Segment } from "../components/Primitives";

const Pill: React.FC<{ text: string; delay: number; tone?: string }> = ({ text, delay, tone = C.gold }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22 } });
  return (
    <div
      style={{
        fontFamily: body,
        fontSize: 12,
        padding: "6px 14px",
        borderRadius: 999,
        border: `1px solid ${tone}`,
        color: C.ink,
        background: `${tone}22`,
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
  );
};

export const Scene3_Profile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Parallax scroll inside the device
  const scrollY = interpolate(frame, [120, 380], [0, -260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = Math.sin(frame / 70) * 3;

  const purchases = [
    { d: "12 May", n: "Génifique Sérum 50ml", v: "$3,490" },
    { d: "03 Abr", n: "Absolue Soft Cream", v: "$5,290" },
    { d: "21 Feb", n: "Teint Idole 24H", v: "$1,180" },
    { d: "02 Feb", n: "La Vie Est Belle EDP 100ml", v: "$3,950" },
    { d: "14 Ene", n: "Rénergie H.P.N. Crema", v: "$4,690" },
  ];

  return (
    <AbsoluteFill>
      <PersistentBg tone="dark" />
      <AbsoluteFill style={{ flexDirection: "row", padding: 80, gap: 50, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
          <Eyebrow text="Fase 03 · Perfil 360°" delay={0} />
          <RevealText text="Una sola historia." fontSize={68} delay={6} color={C.cream} />
          <RevealText text="Toda su piel," fontSize={68} delay={16} color={C.cream} />
          <RevealText text="todo su gusto." fontSize={68} delay={26} color={C.gold} family={displayItalic} italic />
          <div style={{ marginTop: 16, maxWidth: 420 }}>
            <RevealText
              text="La conversación nunca empieza de cero."
              fontSize={20}
              delay={60}
              color={C.cream}
              family={body}
              weight={300}
              lineHeight={1.45}
              letterSpacing="0em"
            />
          </div>
        </div>

        <div style={{ flex: 1, transform: `translateY(${drift}px)` }}>
          <DeviceFrame width={620} height={680}>
            <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
              <div style={{ transform: `translateY(${scrollY}px)`, padding: 28 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                  <Avatar initials="ML" tone={C.gold} size={72} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: display, fontSize: 32, color: C.ink }}>Mariana López</div>
                    <div style={{ fontFamily: body, fontSize: 12, color: C.muted, marginTop: 2 }}>
                      Cliente desde 2022 · Polanco
                    </div>
                  </div>
                  <Segment kind="VIP" />
                </div>

                {/* Beauty profile */}
                <div
                  style={{
                    background: C.paper,
                    borderRadius: 14,
                    padding: 18,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      fontFamily: body,
                      fontSize: 10,
                      letterSpacing: "0.25em",
                      color: C.muted,
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Perfil de belleza
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <Pill text="Piel mixta" delay={50} tone={C.gold} />
                    <Pill text="Tono medio cálido" delay={62} tone={C.nude} />
                    <Pill text="Anti-edad" delay={74} tone={C.rose} />
                    <Pill text="Hidratación" delay={86} tone={C.green} />
                    <Pill text="Ácido hialurónico" delay={98} tone={C.gold} />
                    <Pill text="Sin fragancia añadida" delay={110} tone={C.nude} />
                  </div>
                </div>

                {/* Historial */}
                <div style={{ marginTop: 22 }}>
                  <div
                    style={{
                      fontFamily: body,
                      fontSize: 10,
                      letterSpacing: "0.25em",
                      color: C.muted,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Historial transaccional
                  </div>
                  {purchases.map((p, i) => {
                    const s = spring({ frame: frame - 140 - i * 10, fps, config: { damping: 22 } });
                    return (
                      <div
                        key={p.n}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "10px 4px",
                          borderBottom: "1px solid rgba(0,0,0,0.06)",
                          opacity: s,
                          transform: `translateX(${interpolate(s, [0, 1], [20, 0])}px)`,
                        }}
                      >
                        <div style={{ fontFamily: body, fontSize: 11, color: C.muted, width: 60 }}>{p.d}</div>
                        <div style={{ flex: 1, fontFamily: body, fontSize: 14, color: C.ink, fontWeight: 500 }}>
                          {p.n}
                        </div>
                        <div style={{ fontFamily: display, fontSize: 18, color: C.gold }}>{p.v}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Última recomendación */}
                <div
                  style={{
                    marginTop: 22,
                    padding: 18,
                    borderRadius: 14,
                    background: C.ink,
                    color: C.cream,
                  }}
                >
                  <div
                    style={{
                      fontFamily: body,
                      fontSize: 10,
                      letterSpacing: "0.25em",
                      color: C.gold,
                      textTransform: "uppercase",
                    }}
                  >
                    Última recomendación · 24 May
                  </div>
                  <div style={{ fontFamily: display, fontSize: 22, marginTop: 8 }}>
                    Rénergie H.P.N. 300-Peptide Cream
                  </div>
                  <div style={{ fontFamily: body, fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    Sugerido por Sofia García · Convertido ✓
                  </div>
                </div>
              </div>

              {/* Top fade */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 30,
                  background: `linear-gradient(${C.cream}, transparent)`,
                  pointerEvents: "none",
                }}
              />
            </div>
          </DeviceFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};