import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body } from "../theme";
import { PersistentBg, Eyebrow, RevealText, DeviceFrame, Avatar, Segment } from "../components/Primitives";

const KpiCard: React.FC<{ label: string; value: string; delta: string; delay: number; accent?: boolean }> = ({
  label,
  value,
  delta,
  delay,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const numScale = spring({ frame: frame - delay - 6, fps, config: { damping: 18 } });
  return (
    <div
      style={{
        background: accent ? C.ink : C.cream,
        color: accent ? C.cream : C.ink,
        border: `1px solid ${accent ? C.gold : "rgba(0,0,0,0.08)"}`,
        padding: 22,
        borderRadius: 16,
        opacity: s,
        transform: `translateY(${y}px)`,
        flex: 1,
      }}
    >
      <div
        style={{
          fontFamily: body,
          fontSize: 10,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 56,
          fontWeight: 300,
          marginTop: 6,
          transform: `scale(${interpolate(numScale, [0, 1], [0.6, 1])})`,
          transformOrigin: "left center",
          color: accent ? C.gold : C.ink,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: body, fontSize: 11, opacity: 0.6, marginTop: 4 }}>{delta}</div>
    </div>
  );
};

const ApptRow: React.FC<{ time: string; name: string; type: string; segment: any; delay: number; tone: string }> = ({
  time,
  name,
  type,
  segment,
  delay,
  tone,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22 } });
  const x = interpolate(s, [0, 1], [30, 0]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 4px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        opacity: s,
        transform: `translateX(${x}px)`,
      }}
    >
      <div style={{ fontFamily: display, fontSize: 24, width: 70, color: C.ink, fontWeight: 400 }}>{time}</div>
      <Avatar initials={name.split(" ").map((n) => n[0]).join("")} tone={tone} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: body, fontSize: 14, color: C.ink, fontWeight: 500 }}>{name}</div>
        <div style={{ fontFamily: body, fontSize: 11, color: C.muted }}>{type}</div>
      </div>
      <Segment kind={segment} />
    </div>
  );
};

export const Scene1_Home: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drift = Math.sin(frame / 60) * 4;

  return (
    <AbsoluteFill>
      <PersistentBg tone="dark" />
      <AbsoluteFill style={{ flexDirection: "row", padding: 80, gap: 60, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
          <Eyebrow text="Fase 01 · Inicio" delay={0} />
          <RevealText text="Tu día," fontSize={88} delay={10} color={C.cream} />
          <RevealText text="ya organizado." fontSize={88} delay={20} color={C.gold} family={display} italic />
          <div style={{ marginTop: 12, maxWidth: 480 }}>
            <RevealText
              text="Citas, alertas y cumpleaños listos antes de tu primer café."
              fontSize={22}
              delay={60}
              color={C.cream}
              family={body}
              weight={300}
              lineHeight={1.4}
              letterSpacing="0em"
            />
          </div>
        </div>

        <div style={{ flex: 1.2, transform: `translateY(${drift}px)` }}>
          <DeviceFrame width={780} height={520}>
            <div style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ opacity: spring({ frame: frame - 20, fps, config: { damping: 200 } }) }}>
                <div style={{ fontFamily: body, fontSize: 10, letterSpacing: "0.3em", color: C.muted, textTransform: "uppercase" }}>
                  Miércoles · 3 de Junio
                </div>
                <div style={{ fontFamily: display, fontSize: 36, color: C.ink, marginTop: 4 }}>
                  Buenos días, Sofia.
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <KpiCard label="Consumidoras" value="142" delta="+3 nuevas" delay={50} />
                <KpiCard label="Compras 7d" value="26" delta="$195k MXN" delay={65} />
                <KpiCard label="Citas hoy" value="4" delta="Próxima 11:00" delay={80} accent />
              </div>

              <div
                style={{
                  background: C.cream,
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 14,
                  padding: "8px 18px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontFamily: body,
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    color: C.muted,
                    textTransform: "uppercase",
                    padding: "8px 0",
                  }}
                >
                  Hoy en cabina
                </div>
                <ApptRow time="11:00" name="Mariana López" type="Facial Génifique" segment="VIP" delay={120} tone={C.gold} />
                <ApptRow time="13:30" name="Carla Méndez" type="Cabina VIP" segment="Recurrente" delay={150} tone={C.green} />
                <ApptRow time="16:00" name="Ana Ruiz" type="Seguimiento" segment="Nueva" delay={180} tone={C.nude} />
              </div>
            </div>
          </DeviceFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};