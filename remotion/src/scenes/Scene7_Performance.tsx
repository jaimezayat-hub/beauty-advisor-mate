import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body, displayItalic } from "../theme";
import { PersistentBg, Eyebrow, RevealText, DeviceFrame } from "../components/Primitives";

const KpiBig: React.FC<{ label: string; from: number; to: number; suffix?: string; prefix?: string; delay: number }> = ({
  label,
  from,
  to,
  suffix = "",
  prefix = "",
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const v = interpolate(s, [0, 1], [from, to]);
  return (
    <div>
      <div
        style={{
          fontFamily: body,
          fontSize: 10,
          letterSpacing: "0.25em",
          color: C.muted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: display, fontSize: 64, color: C.ink, fontWeight: 300, marginTop: 4 }}>
        {prefix}
        {Math.round(v).toLocaleString("es-MX")}
        {suffix}
      </div>
    </div>
  );
};

const POINTS = [25, 45, 38, 62, 55, 78, 70, 95, 88, 110, 102, 130];

export const Scene7_Performance: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chartProgress = interpolate(frame, [120, 320], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const W = 720;
  const H = 220;
  const max = Math.max(...POINTS);
  const pts = POINTS.map((p, i) => ({
    x: (i / (POINTS.length - 1)) * W,
    y: H - (p / max) * (H - 20),
  }));
  const path = pts.reduce((a, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${a} L ${p.x} ${p.y}`), "");
  const areaPath = `${path} L ${W} ${H} L 0 ${H} Z`;

  const exportIn = spring({ frame: frame - 340, fps, config: { damping: 22 } });
  const drift = Math.sin(frame / 60) * 3;

  return (
    <AbsoluteFill>
      <PersistentBg tone="dark" />
      <AbsoluteFill style={{ flexDirection: "column", padding: 70, gap: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Eyebrow text="Fase 07 · Desempeño" delay={0} />
            <RevealText text="Cada BA, en tiempo real." fontSize={64} delay={6} color={C.cream} />
            <RevealText text="Cada tienda, cada zona." fontSize={64} delay={16} color={C.gold} family={displayItalic} italic />
          </div>
          <div style={{ maxWidth: 360, paddingBottom: 12 }}>
            <RevealText
              text="Adopción, ventas, ranking y exportación a Excel con un click."
              fontSize={16}
              delay={50}
              color={C.cream}
              family={body}
              weight={300}
              lineHeight={1.5}
              letterSpacing="0em"
            />
          </div>
        </div>

        <div style={{ flex: 1, transform: `translateY(${drift}px)` }}>
          <DeviceFrame width={1280} height={540}>
            <div style={{ padding: 32, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Top KPIs */}
              <div style={{ display: "flex", gap: 48 }}>
                <KpiBig label="Ventas del mes" from={0} to={195030} prefix="$" delay={60} />
                <KpiBig label="Adopción" from={0} to={97} suffix="/100" delay={90} />
                <KpiBig label="Ticket promedio" from={0} to={7501} prefix="$" delay={120} />
                <KpiBig label="Ranking" from={20} to={2} prefix="#" delay={150} />
              </div>

              {/* Chart */}
              <div style={{ flex: 1, position: "relative" }}>
                <div
                  style={{
                    fontFamily: body,
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    color: C.muted,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Ventas últimas 12 semanas
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.gold} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area */}
                  <path
                    d={areaPath}
                    fill="url(#grad)"
                    opacity={chartProgress}
                  />
                  {/* Line */}
                  <path
                    d={path}
                    fill="none"
                    stroke={C.gold}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={W * 1.5}
                    strokeDashoffset={(1 - chartProgress) * W * 1.5}
                  />
                  {/* Dots */}
                  {pts.map((p, i) => {
                    const reveal = chartProgress > i / pts.length;
                    return reveal ? (
                      <circle key={i} cx={p.x} cy={p.y} r="4" fill={C.ink} stroke={C.gold} strokeWidth="2" />
                    ) : null;
                  })}
                </svg>
              </div>

              {/* Export */}
              <div
                style={{
                  alignSelf: "flex-end",
                  background: C.gold,
                  color: C.ink,
                  padding: "10px 18px",
                  borderRadius: 999,
                  fontFamily: body,
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  opacity: exportIn,
                  transform: `translateY(${interpolate(exportIn, [0, 1], [12, 0])}px) scale(${interpolate(
                    exportIn,
                    [0, 1],
                    [0.9, 1],
                  )})`,
                }}
              >
                ↓ Exportar a Excel
              </div>
            </div>
          </DeviceFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};