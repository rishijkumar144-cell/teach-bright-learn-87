import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../MainVideo";

export const Scene1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const badgeS = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const sub = spring({ frame: frame - 20, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", alignItems: "flex-start" }}>
      <div
        style={{
          transform: `scale(${badgeS})`,
          padding: "10px 20px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "white",
          fontWeight: 600,
          fontSize: 24,
          letterSpacing: 1,
          marginBottom: 32,
        }}
      >
        ✦ MEET QUESTLY
      </div>
      <h1
        style={{
          fontFamily: FONTS.display,
          fontWeight: 800,
          fontSize: 120,
          lineHeight: 1.02,
          color: "white",
          margin: 0,
          transform: `translateY(${y}px)`,
          opacity: s,
          letterSpacing: -3,
        }}
      >
        Math lessons<br />every learner<br />can access.
      </h1>
      <p
        style={{
          marginTop: 40,
          fontSize: 36,
          color: "rgba(255,255,255,0.75)",
          maxWidth: 800,
          opacity: sub,
          transform: `translateY(${interpolate(sub, [0, 1], [20, 0])}px)`,
        }}
      >
        Built for teachers. Loved by students with ADHD & dyslexia.
      </p>
    </AbsoluteFill>
  );
};
