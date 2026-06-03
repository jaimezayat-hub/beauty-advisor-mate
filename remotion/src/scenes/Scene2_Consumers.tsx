import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body, displayItalic } from "../theme";
import { PersistentBg, Eyebrow, RevealText, DeviceFrame, Avatar, Segment } from "../components/Primitives";

const CONSUMERS = [
  { n: "Mariana López", e: "mariana.l@email.com", s: "VIP", t: C.gold, last: "Hace 2 días" },
  { n: "Carla Méndez", e: "carlam@email.com", s: "Recurrente", t: C.green, last: "Hace 1 semana" },
  { n: "Sofía Hernández", e: "sofiah@email.com", s: "Nueva", t: C.nude, last: "Hoy" },
  { n: "Ana Ruiz", e: "ana.r@email.com", s: "Recurrente", t: C.rose, last: "Hace 3 días" },
  { n: "Patricia Vega", e: "pvega@email.com", s: "En Riesgo", t: C.red, last: "Hace 72 días" },
] as const;

export const Scene2_Consumers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Onboarding modal appears from frame 280
  const modalIn = spring({ frame: frame - 280, fps, config: { damping: 22 } });
  const stepProgress = interpolate(frame, [310, 360, 400, 440], [1, 2, 3, 3], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const drift = Math.sin(frame / 70) * 3;

  return (
    <AbsoluteFill>
      <PersistentBg tone="light" />
      <AbsoluteFill style={{ padding: 80, gap: 40, flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Eyebrow text="Fase 02 · Consumidoras" color={C.ink} delay={0} />
            <RevealText text="Toda tu cartera" fontSize={72} delay={6} color={C.ink} />
            <RevealText text="reconocida al instante." fontSize={72} delay={14} color={C.rose} family={displayItalic} italic />
          </div>
          <div style={{ maxWidth: 360 }}>
            <RevealText
              text="Búsqueda inmediata. Segmentación automática. Aviso de privacidad firmado en pantalla."
              fontSize={18}
              delay={50}
              color={C.ink}
              family={body}
              weight={300}
              lineHeight={1.45}
              letterSpacing="0em"
            />
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", transform: `translateY(${drift}px)` }}>
          <DeviceFrame width={1280} height={620}>
            <div style={{ padding: 32, height: "100%" }}>
              {/* Search bar */}
              <div
                style={{
                  background: C.paper,
                  borderRadius: 12,
                  padding: "14px 20px",
                  fontFamily: body,
                  fontSize: 16,
                  color: C.muted,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ opacity: 0.6 }}>⌕</span>
                <span>Buscar por nombre, email o teléfono…</span>
              </div>

              {/* List */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {CONSUMERS.map((c, i) => {
                  const s = spring({ frame: frame - 80 - i * 12, fps, config: { damping: 22 } });
                  const x = interpolate(s, [0, 1], [40, 0]);
                  return (
                    <div
                      key={c.n}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 18,
                        padding: "16px 8px",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        opacity: s,
                        transform: `translateX(${x}px)`,
                      }}
                    >
                      <Avatar initials={c.n.split(" ").map((x) => x[0]).join("")} tone={c.t} size={48} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: display, fontSize: 22, color: C.ink, fontWeight: 500 }}>{c.n}</div>
                        <div style={{ fontFamily: body, fontSize: 12, color: C.muted, marginTop: 2 }}>{c.e}</div>
                      </div>
                      <div style={{ fontFamily: body, fontSize: 12, color: C.muted, width: 140, textAlign: "right" }}>
                        Última visita · {c.last}
                      </div>
                      <Segment kind={c.s as any} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Onboarding modal overlay */}
            {modalIn > 0.01 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(10,10,10,0.55)",
                  opacity: modalIn,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 640,
                    background: C.cream,
                    borderRadius: 18,
                    padding: 36,
                    transform: `scale(${interpolate(modalIn, [0, 1], [0.92, 1])})`,
                    boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: body,
                      fontSize: 11,
                      letterSpacing: "0.3em",
                      color: C.gold,
                      textTransform: "uppercase",
                    }}
                  >
                    Nueva consumidora · Paso {Math.min(3, Math.round(stepProgress))} de 3
                  </div>
                  <div style={{ fontFamily: display, fontSize: 32, color: C.ink, marginTop: 8 }}>
                    {stepProgress < 1.5
                      ? "Datos básicos"
                      : stepProgress < 2.5
                        ? "Perfil de belleza"
                        : "Aviso de privacidad"}
                  </div>
                  {/* Stepper */}
                  <div style={{ display: "flex", gap: 8, marginTop: 18, marginBottom: 24 }}>
                    {[0, 1, 2].map((i) => {
                      const filled = stepProgress > i + 0.5;
                      return (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            background: filled ? C.gold : "rgba(0,0,0,0.1)",
                          }}
                        />
                      );
                    })}
                  </div>
                  {/* Step body */}
                  {stepProgress < 1.5 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      {["Nombre", "Apellido", "Email", "Teléfono"].map((f) => (
                        <div key={f}>
                          <div style={{ fontFamily: body, fontSize: 10, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                            {f}
                          </div>
                          <div style={{ borderBottom: `1px solid ${C.ink}`, marginTop: 8, height: 24 }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {stepProgress >= 1.5 && stepProgress < 2.5 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {["Skincare", "Fragancia", "Makeup", "Piel mixta", "Anti-edad", "Hidratación"].map((tag, i) => {
                        const on = i < 4;
                        return (
                          <div
                            key={tag}
                            style={{
                              fontFamily: body,
                              fontSize: 13,
                              padding: "8px 16px",
                              borderRadius: 999,
                              border: `1px solid ${on ? C.gold : "rgba(0,0,0,0.15)"}`,
                              background: on ? C.gold : "transparent",
                              color: on ? C.ink : C.muted,
                              fontWeight: 500,
                            }}
                          >
                            {tag}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {stepProgress >= 2.5 && (
                    <div>
                      <div style={{ fontFamily: body, fontSize: 13, color: C.ink, lineHeight: 1.5, opacity: 0.75 }}>
                        Acepto el tratamiento de mis datos personales conforme al aviso de privacidad de L'Oréal México.
                      </div>
                      <div
                        style={{
                          marginTop: 18,
                          height: 90,
                          borderRadius: 10,
                          background: C.paper,
                          border: "1px dashed rgba(0,0,0,0.15)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <svg width="100%" height="100%" viewBox="0 0 600 90" style={{ position: "absolute" }}>
                          <path
                            d={`M 40 60 Q 80 20, 120 50 T 200 50 Q 240 75, 280 40 T 360 55 Q 420 30, 470 60`}
                            fill="none"
                            stroke={C.ink}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray="600"
                            strokeDashoffset={interpolate(frame, [410, 460], [600, 0], {
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                            })}
                          />
                        </svg>
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 10,
                            fontFamily: body,
                            fontSize: 9,
                            color: C.muted,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                          }}
                        >
                          Firma digital
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DeviceFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};