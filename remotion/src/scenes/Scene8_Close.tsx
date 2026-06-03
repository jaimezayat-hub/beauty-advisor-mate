import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, body, displayItalic } from "../theme";
import { PersistentBg, GoldGrain } from "../components/Primitives";

export const Scene8_Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1 = spring({ frame: frame - 10, fps, config: { damping: 25 } });
  const line2 = spring({ frame: frame - 50, fps, config: { damping: 25 } });
  const line3 = spring({ frame: frame - 90, fps, config: { damping: 25 } });
  const lineW = interpolate(spring({ frame: frame - 130, fps, config: { damping: 200 } }), [0, 1], [0, 400]);
  const ctaIn = spring({ frame: frame - 180, fps, config: { damping: 200 } });
  const fadeOut = interpolate(frame, [320, 380], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = Math.sin(frame / 50) * 2;

  return (
    <AbsoluteFill>
      <PersistentBg tone="dark" />
      <GoldGrain opacity={0.14} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
        <div style={{ textAlign: "center", transform: `translateY(${drift}px)` }}>
          <div
            style={{
              fontFamily: display,
              fontSize: 88,
              color: C.cream,
              fontWeight: 300,
              opacity: line1,
              transform: `translateY(${interpolate(line1, [0, 1], [20, 0])}px)`,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Clienteling con IA.
          </div>
          <div
            style={{
              fontFamily: display,
              fontSize: 88,
              color: C.cream,
              fontWeight: 300,
              opacity: line2,
              transform: `translateY(${interpolate(line2, [0, 1], [20, 0])}px)`,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginTop: 6,
            }}
          >
            Diseñado para tu BA.
          </div>
          <div
            style={{
              fontFamily: displayItalic,
              fontSize: 96,
              color: C.gold,
              fontStyle: "italic",
              fontWeight: 400,
              opacity: line3,
              transform: `translateY(${interpolate(line3, [0, 1], [20, 0])}px)`,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginTop: 14,
            }}
          >
            El lujo, ahora, recuerda.
          </div>

          <div
            style={{
              width: lineW,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
              margin: "48px auto 32px",
            }}
          />

          <div
            style={{
              fontFamily: body,
              fontSize: 14,
              letterSpacing: "0.5em",
              color: C.cream,
              opacity: ctaIn * 0.75,
              textTransform: "uppercase",
            }}
          >
            Palacio · Liverpool · Q3 2026
          </div>
          <div
            style={{
              fontFamily: body,
              fontSize: 11,
              letterSpacing: "0.6em",
              color: C.gold,
              opacity: ctaIn * 0.6,
              textTransform: "uppercase",
              marginTop: 14,
            }}
          >
            Lancôme · Yves Saint Laurent
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};