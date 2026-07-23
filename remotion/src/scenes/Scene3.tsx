import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../MainVideo";

export const Scene3 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const bars = [0.5, 0.75, 0.6, 0.9, 0.7, 0.95];
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", alignItems: "center" }}>
      <h2
        style={{
          fontFamily: FONTS.display,
          fontSize: 84,
          color: "white",
          fontWeight: 800,
          margin: 0,
          marginBottom: 40,
          opacity: s,
          textAlign: "center",
          letterSpacing: -2,
        }}
      >
        Real interactive math.
      </h2>
      <div
        style={{
          width: 800,
          height: 500,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 32,
          padding: 40,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          opacity: s,
          transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
        }}
      >
        {bars.map((h, i) => {
          const bs = spring({ frame: frame - 20 - i * 6, fps, config: { damping: 12 } });
          return (
            <div
              key={i}
              style={{
                width: 80,
                height: 400 * h * bs,
                borderRadius: 12,
                background: `linear-gradient(180deg, hsl(${260 + i * 15} 80% 65%), hsl(${280 + i * 15} 80% 45%))`,
                boxShadow: `0 0 40px hsl(${270 + i * 15} 80% 60% / 0.5)`,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 32,
          color: "rgba(255,255,255,0.75)",
          opacity: spring({ frame: frame - 60, fps, config: { damping: 200 } }),
        }}
      >
        Students drag, plot, and solve — live.
      </div>
    </AbsoluteFill>
  );
};
