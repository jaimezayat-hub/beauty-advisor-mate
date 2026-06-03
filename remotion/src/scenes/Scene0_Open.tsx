import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, display, displayItalic, body } from "../theme";
import { PersistentBg, GoldGrain, RevealText } from "../components/Primitives";

export const Scene0_Open: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - 10, fps, config: { damping: 30 } });
  const lineW = interpolate(spring({ frame: frame - 50, fps, config: { damping: 200 } }), [0, 1], [0, 320]);
  const taglineIn = spring({ frame: frame - 90, fps, config: { damping: 25 } });
  const taglineY = interpolate(taglineIn, [0, 1], [30, 0]);
  const subIn = spring({ frame: frame - 140, fps, config: { damping: 200 } });
  const outOpacity = interpolate(frame, [220, 270], [1, 0.4], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const drift = Math.sin(frame / 40) * 3;

  return (
    <AbsoluteFill>
      <PersistentBg tone="dark" />
      <GoldGrain opacity={0.12} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: outOpacity }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 36,
            transform: `translateY(${drift}px)`,
          }}
        >
          <div
            style={{
              fontFamily: body,
              fontSize: 13,
              letterSpacing: "0.6em",
              color: C.gold,
              opacity: logoIn,
              textTransform: "uppercase",
              transform: `translateY(${interpolate(logoIn, [0, 1], [-10, 0])}px)`,
            }}
          >
            Lancôme · Yves Saint Laurent
          </div>

          <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }} />

          <div
            style={{
              transform: `translateY(${taglineY}px)`,
              opacity: taglineIn,
              textAlign: "center",
              maxWidth: 1100,
            }}
          >
            <div
              style={{
                fontFamily: display,
                fontSize: 96,
                color: C.cream,
                fontWeight: 300,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              El lujo también
            </div>
            <div
              style={{
                fontFamily: displayItalic,
                fontSize: 132,
                color: C.gold,
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              recuerda.
            </div>
          </div>

          <div
            style={{
              opacity: subIn,
              fontFamily: body,
              fontSize: 16,
              letterSpacing: "0.35em",
              color: C.cream,
              textTransform: "uppercase",
              marginTop: 24,
            }}
          >
            Clienteling con IA · Edición Beauty Advisor
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};