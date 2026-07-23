import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../MainVideo";

export const Scene5 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 10 } });
  const tag = spring({ frame: frame - 15, fps, config: { damping: 200 } });
  const cta = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  const pulse = 1 + 0.03 * Math.sin(frame / 6);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 200,
          fontWeight: 800,
          color: "white",
          transform: `scale(${logo * pulse})`,
          letterSpacing: -6,
          textShadow: "0 0 80px rgba(167,139,250,0.6)",
        }}
      >
        Questly
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 40,
          color: "rgba(255,255,255,0.8)",
          opacity: tag,
          transform: `translateY(${interpolate(tag, [0, 1], [20, 0])}px)`,
        }}
      >
        Learn different. Learn better.
      </div>
      <div
        style={{
          marginTop: 60,
          padding: "24px 56px",
          borderRadius: 999,
          background: "linear-gradient(135deg,#a78bfa,#7c3aed)",
          color: "white",
          fontSize: 40,
          fontWeight: 700,
          opacity: cta,
          transform: `scale(${cta})`,
          boxShadow: "0 20px 60px rgba(124,58,237,0.5)",
        }}
      >
        Sign up free →
      </div>
    </AbsoluteFill>
  );
};
