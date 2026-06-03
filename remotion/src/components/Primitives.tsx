import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";

export const PersistentBg: React.FC<{ tone?: "dark" | "light" }> = ({ tone = "dark" }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const x = Math.sin(t * 0.2) * 8;
  const y = Math.cos(t * 0.15) * 6;
  if (tone === "light") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(60% 50% at ${50 + x}% ${40 + y}%, #FBF7EF 0%, ${C.cream} 45%, ${C.paper} 100%)`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(70% 60% at ${50 + x}% ${45 + y}%, #1A1612 0%, ${C.black} 60%, #050505 100%)`,
      }}
    />
  );
};

export const GoldGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const frame = useCurrentFrame();
  const dots = React.useMemo(() => {
    const arr: { x: number; y: number; s: number; o: number }[] = [];
    for (let i = 0; i < 120; i++) {
      const r = (i * 9301 + 49297) % 233280;
      const r2 = (i * 1234567 + 7) % 233280;
      const r3 = (i * 7777 + 13) % 233280;
      arr.push({
        x: (r / 233280) * 100,
        y: (r2 / 233280) * 100,
        s: 1 + (r3 / 233280) * 3,
        o: 0.3 + (r3 / 233280) * 0.7,
      });
    }
    return arr;
  }, []);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity }}>
      {dots.map((d, i) => {
        const drift = Math.sin((frame + i * 7) / 60) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${d.x}%`,
              top: `${d.y + drift * 0.2}%`,
              width: d.s,
              height: d.s,
              borderRadius: "50%",
              background: C.gold,
              opacity: d.o,
            }}
          />
        );
      })}
    </div>
  );
};

export const Eyebrow: React.FC<{ text: string; color?: string; delay?: number }> = ({
  text,
  color = C.gold,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const w = interpolate(o, [0, 1], [0, 60]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: o }}>
      <div style={{ width: w, height: 1, background: color }} />
      <span
        style={{
          fontFamily: body,
          fontSize: 14,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color,
          fontWeight: 500,
        }}
      >
        {text}
      </span>
    </div>
  );
};

export const RevealText: React.FC<{
  text: string;
  fontSize: number;
  delay?: number;
  color?: string;
  family?: string;
  weight?: number | string;
  italic?: boolean;
  lineHeight?: number;
  letterSpacing?: string;
}> = ({
  text,
  fontSize,
  delay = 0,
  color = C.cream,
  family = display,
  weight = 400,
  italic = false,
  lineHeight = 1.05,
  letterSpacing = "-0.02em",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: family,
        fontSize,
        color,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        lineHeight,
        letterSpacing,
        display: "flex",
        flexWrap: "wrap",
        gap: `0 ${fontSize * 0.25}px`,
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - delay - i * 4, fps, config: { damping: 22 } });
        const y = interpolate(s, [0, 1], [fontSize * 0.4, 0]);
        const blur = interpolate(s, [0, 1], [12, 0]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: s,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const DeviceFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
  scale?: number;
}> = ({ children, width = 900, height = 600, scale = 1 }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 24,
        background: C.cream,
        boxShadow:
          "0 60px 120px rgba(0,0,0,0.55), 0 20px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(201,168,76,0.25)",
        overflow: "hidden",
        position: "relative",
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          height: 36,
          background: C.paper,
          borderBottom: `1px solid rgba(0,0,0,0.06)`,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          gap: 8,
        }}
      >
        {[C.rose, C.gold, C.green].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 6, background: c, opacity: 0.7 }} />
        ))}
        <div
          style={{
            marginLeft: 24,
            fontFamily: body,
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          Clienteling · Lancôme
        </div>
      </div>
      <div style={{ position: "relative", width: "100%", height: height - 36 }}>{children}</div>
    </div>
  );
};

export const Segment: React.FC<{ kind: "VIP" | "Recurrente" | "Nueva" | "En Riesgo" }> = ({ kind }) => {
  const map = {
    VIP: { bg: C.gold, fg: C.black },
    Recurrente: { bg: C.green, fg: C.cream },
    Nueva: { bg: C.nude, fg: C.ink },
    "En Riesgo": { bg: C.red, fg: C.cream },
  } as const;
  const s = map[kind];
  return (
    <span
      style={{
        fontFamily: body,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.fg,
        padding: "4px 10px",
        borderRadius: 999,
        fontWeight: 600,
      }}
    >
      {kind}
    </span>
  );
};

export const Avatar: React.FC<{ initials: string; tone?: string; size?: number }> = ({
  initials,
  tone = C.nude,
  size = 44,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${tone}, ${C.gold})`,
      color: C.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: display,
      fontSize: size * 0.4,
      fontWeight: 500,
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

export const Cursor: React.FC<{
  path: { frame: number; x: number; y: number }[];
  click?: number[];
}> = ({ path, click = [] }) => {
  const frame = useCurrentFrame();
  let p = path[0];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      const ease = t * t * (3 - 2 * t);
      p = { frame, x: a.x + (b.x - a.x) * ease, y: a.y + (b.y - a.y) * ease };
      break;
    }
    if (frame > b.frame) p = b;
  }
  const isClicking = click.some((c) => Math.abs(frame - c) < 6);
  const clickScale = isClicking ? 1.3 : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: `${p.x}%`,
        top: `${p.y}%`,
        transform: `translate(-4px, -2px) scale(${clickScale})`,
        pointerEvents: "none",
        zIndex: 50,
        transition: "none",
      }}
    >
      <svg width="24" height="28" viewBox="0 0 24 28">
        <path
          d="M2 2 L2 22 L7 18 L10 26 L13 25 L10 17 L17 17 Z"
          fill={C.cream}
          stroke={C.black}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {isClicking && (
        <div
          style={{
            position: "absolute",
            top: -8,
            left: -8,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: `2px solid ${C.gold}`,
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
};