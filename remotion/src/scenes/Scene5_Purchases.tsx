import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body, displayItalic } from "../theme";
import { PersistentBg, Eyebrow, RevealText, DeviceFrame } from "../components/Primitives";

export const Scene5_Purchases: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera viewfinder appears, scan happens, ticket validates
  const scanLineY = interpolate(frame, [120, 240], [0, 100], { extrapolateRight: "clamp" });
  const flashOpacity = interpolate(frame, [240, 250, 280], [0, 1, 0], { extrapolateRight: "clamp" });
  const checkIn = spring({ frame: frame - 280, fps, config: { damping: 14 } });
  const totalCount = interpolate(spring({ frame: frame - 290, fps, config: { damping: 200 } }), [0, 1], [0, 8470]);
  const drift = Math.sin(frame / 60) * 3;

  return (
    <AbsoluteFill>
      <PersistentBg tone="dark" />
      <AbsoluteFill style={{ flexDirection: "row", padding: 80, gap: 60, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
          <Eyebrow text="Fase 05 · Compras" delay={0} />
          <RevealText text="Captura el ticket." fontSize={72} delay={6} color={C.cream} />
          <RevealText text="La venta es tuya." fontSize={72} delay={18} color={C.gold} family={displayItalic} italic />
          <div style={{ marginTop: 16, maxWidth: 440 }}>
            <RevealText
              text="Atribución automática al BA. Cero papel. Cero dudas."
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
          <DeviceFrame width={620} height={540}>
            <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Viewfinder */}
              <div
                style={{
                  flex: 1,
                  background: C.ink,
                  borderRadius: 14,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Faux ticket */}
                <div
                  style={{
                    width: 220,
                    background: C.cream,
                    color: C.ink,
                    padding: 18,
                    borderRadius: 4,
                    fontFamily: "monospace",
                    fontSize: 10,
                    transform: `rotate(-3deg) scale(${interpolate(checkIn, [0, 1], [1, 0.92])})`,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                  }}
                >
                  <div style={{ textAlign: "center", fontFamily: display, fontSize: 16, marginBottom: 8 }}>
                    PALACIO POLANCO
                  </div>
                  <div style={{ borderTop: "1px dashed #999", paddingTop: 6 }}>
                    <div>GÉNIFIQUE 50ML ··· $3,490</div>
                    <div>ABSOLUE CREAM ··· $4,980</div>
                    <div style={{ borderTop: "1px dashed #999", marginTop: 6, paddingTop: 6, fontWeight: 700 }}>
                      TOTAL ··· $8,470
                    </div>
                    <div style={{ marginTop: 6, fontSize: 8, opacity: 0.6 }}>BA: Sofia García · #4521</div>
                  </div>
                </div>

                {/* Corner brackets */}
                {[
                  { top: 30, left: 30 },
                  { top: 30, right: 30 },
                  { bottom: 30, left: 30 },
                  { bottom: 30, right: 30 },
                ].map((p, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      ...p,
                      width: 40,
                      height: 40,
                      borderColor: C.gold,
                      borderStyle: "solid",
                      borderWidth: 0,
                      ...(p.top !== undefined && p.left !== undefined ? { borderTopWidth: 3, borderLeftWidth: 3 } : {}),
                      ...(p.top !== undefined && p.right !== undefined ? { borderTopWidth: 3, borderRightWidth: 3 } : {}),
                      ...(p.bottom !== undefined && p.left !== undefined ? { borderBottomWidth: 3, borderLeftWidth: 3 } : {}),
                      ...(p.bottom !== undefined && p.right !== undefined ? { borderBottomWidth: 3, borderRightWidth: 3 } : {}),
                    }}
                  />
                ))}

                {/* Scan line */}
                {frame > 110 && frame < 245 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 30,
                      right: 30,
                      top: `${scanLineY}%`,
                      height: 2,
                      background: C.gold,
                      boxShadow: `0 0 20px ${C.gold}`,
                    }}
                  />
                )}

                {/* Flash */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: C.cream,
                    opacity: flashOpacity,
                  }}
                />

                {/* Check */}
                {checkIn > 0.01 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(10,10,10,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: checkIn,
                    }}
                  >
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: C.green,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: `scale(${interpolate(checkIn, [0, 1], [0.3, 1])})`,
                      }}
                    >
                      <svg width="50" height="50" viewBox="0 0 50 50">
                        <path
                          d="M 12 26 L 22 36 L 40 16"
                          fill="none"
                          stroke={C.cream}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="60"
                          strokeDashoffset={interpolate(checkIn, [0, 1], [60, 0])}
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Result strip */}
              <div
                style={{
                  background: C.paper,
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontFamily: body, fontSize: 10, letterSpacing: "0.25em", color: C.muted, textTransform: "uppercase" }}>
                    Compra registrada · Sofia García
                  </div>
                  <div style={{ fontFamily: display, fontSize: 28, color: C.ink, marginTop: 4 }}>
                    ${Math.round(totalCount).toLocaleString("es-MX")} MXN
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: body,
                    fontSize: 11,
                    color: C.green,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    opacity: checkIn,
                  }}
                >
                  ✓ Atribuida
                </div>
              </div>
            </div>
          </DeviceFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};