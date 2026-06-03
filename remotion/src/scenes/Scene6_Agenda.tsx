import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body, displayItalic } from "../theme";
import { PersistentBg, Eyebrow, RevealText, DeviceFrame } from "../components/Primitives";

const CAL = [
  ["", "Lun 1", "Mar 2", "Mié 3", "Jue 4", "Vie 5", "Sáb 6"],
];

const SLOTS = [
  { day: 1, hour: 0, who: "Carla M.", type: "Facial", tone: C.gold },
  { day: 2, hour: 2, who: "Ana R.", type: "Cabina", tone: C.nude },
  { day: 3, hour: 1, who: "Mariana L.", type: "Génifique", tone: C.gold },
  { day: 3, hour: 3, who: "Sofía H.", type: "Color match", tone: C.rose },
  { day: 4, hour: 0, who: "Patricia V.", type: "Reactivar", tone: C.red },
  { day: 5, hour: 2, who: "Renata G.", type: "Masterclass", tone: C.green },
];

export const Scene6_Agenda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // WhatsApp bubble enters mid-scene
  const waIn = spring({ frame: frame - 260, fps, config: { damping: 22 } });
  const typing = Math.floor((frame - 320) / 8) % 28;
  const fullMsg = "¡Hola Mariana! Te recuerdo tu cita mañana 11:00 en Palacio Polanco. ¿Confirmas? — Sofia ✨";
  const typed = frame > 320 ? fullMsg.slice(0, Math.max(0, Math.floor((frame - 320) * 1.4))) : "";
  const drift = Math.sin(frame / 60) * 3;

  return (
    <AbsoluteFill>
      <PersistentBg tone="light" />
      <AbsoluteFill style={{ flexDirection: "column", padding: 70, gap: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Eyebrow text="Fase 06 · Agenda + Follow-up" color={C.ink} delay={0} />
            <RevealText text="El mensaje correcto," fontSize={64} delay={6} color={C.ink} />
            <RevealText text="en el momento correcto." fontSize={64} delay={16} color={C.green} family={displayItalic} italic />
          </div>
          <div style={{ maxWidth: 360, paddingBottom: 12 }}>
            <RevealText
              text="Citas, visitas y seguimientos automáticos por WhatsApp."
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

        <div style={{ flex: 1, display: "flex", gap: 24, transform: `translateY(${drift}px)` }}>
          {/* Calendar */}
          <div style={{ flex: 1.2 }}>
            <DeviceFrame width="100%" height={520}>
              <div style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontFamily: display,
                    fontSize: 22,
                    color: C.ink,
                    marginBottom: 12,
                  }}
                >
                  Junio 2026 · Esta semana
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "60px repeat(6, 1fr)",
                    gridTemplateRows: "30px repeat(4, 1fr)",
                    gap: 4,
                  }}
                >
                  {/* Headers */}
                  <div />
                  {CAL[0].slice(1).map((d) => (
                    <div
                      key={d}
                      style={{
                        fontFamily: body,
                        fontSize: 10,
                        letterSpacing: "0.2em",
                        color: C.muted,
                        textTransform: "uppercase",
                        textAlign: "center",
                        paddingTop: 4,
                      }}
                    >
                      {d}
                    </div>
                  ))}
                  {/* Time rows */}
                  {["10:00", "12:00", "14:00", "16:00"].map((h, hi) => (
                    <React.Fragment key={h}>
                      <div
                        style={{
                          fontFamily: body,
                          fontSize: 11,
                          color: C.muted,
                          textAlign: "right",
                          paddingRight: 8,
                          paddingTop: 4,
                        }}
                      >
                        {h}
                      </div>
                      {[0, 1, 2, 3, 4, 5].map((di) => {
                        const slot = SLOTS.find((s) => s.day === di + 1 && s.hour === hi);
                        const delay = 60 + (di * 4 + hi) * 6;
                        const s = slot ? spring({ frame: frame - delay, fps, config: { damping: 22 } }) : 0;
                        return (
                          <div
                            key={`${di}-${hi}`}
                            style={{
                              border: "1px solid rgba(0,0,0,0.06)",
                              borderRadius: 6,
                              background: slot ? `${slot.tone}33` : "transparent",
                              padding: 6,
                              opacity: slot ? s : 1,
                              transform: slot ? `scale(${interpolate(s, [0, 1], [0.85, 1])})` : "none",
                              borderLeft: slot ? `3px solid ${slot.tone}` : "1px solid rgba(0,0,0,0.06)",
                              minHeight: 60,
                            }}
                          >
                            {slot && (
                              <>
                                <div style={{ fontFamily: display, fontSize: 13, color: C.ink, fontWeight: 500 }}>
                                  {slot.who}
                                </div>
                                <div style={{ fontFamily: body, fontSize: 10, color: C.muted, marginTop: 2 }}>
                                  {slot.type}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </DeviceFrame>
          </div>

          {/* Phone with WhatsApp */}
          <div style={{ width: 320 }}>
            <DeviceFrame width={320} height={520}>
              <div
                style={{
                  padding: 16,
                  height: "100%",
                  background: "#E5DDD5",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: body,
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    color: "#6B7C7B",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  WhatsApp · Mariana López
                </div>
                {/* Plantilla recibida bubble */}
                <div
                  style={{
                    alignSelf: "flex-start",
                    background: "white",
                    padding: "8px 12px",
                    borderRadius: 10,
                    maxWidth: "85%",
                    fontFamily: body,
                    fontSize: 12,
                    color: "#222",
                  }}
                >
                  Hola Sofia! Sí, ahí estaré 💄
                </div>
                {/* Outgoing typed message */}
                <div
                  style={{
                    alignSelf: "flex-end",
                    background: "#DCF8C6",
                    padding: "10px 14px",
                    borderRadius: 10,
                    maxWidth: "85%",
                    fontFamily: body,
                    fontSize: 13,
                    color: "#222",
                    lineHeight: 1.4,
                    opacity: waIn,
                    transform: `translateY(${interpolate(waIn, [0, 1], [10, 0])}px)`,
                  }}
                >
                  {typed}
                  {frame > 320 && typed.length < fullMsg.length && (
                    <span style={{ opacity: 0.5 }}>▎</span>
                  )}
                </div>
              </div>
            </DeviceFrame>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};