import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../MainVideo";

const items = [
  { k: "AI", v: "Study buddy & auto-grading" },
  { k: "5", v: "Fun study games" },
  { k: "∞", v: "Accessibility built in" },
];

export const Scene4 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <h2
        style={{
          fontFamily: FONTS.display,
          fontSize: 84,
          color: "white",
          fontWeight: 800,
          margin: 0,
          marginBottom: 60,
          opacity: t,
          letterSpacing: -2,
        }}
      >
        Smart. Playful.<br />Inclusive.
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {items.map((it, i) => {
          const s = spring({ frame: frame - 20 - i * 15, fps, config: { damping: 14 } });
          return (
            <div
              key={it.k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 36,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 120,
                  fontWeight: 800,
                  color: "transparent",
                  WebkitTextStroke: "3px white",
                  minWidth: 180,
                }}
              >
                {it.k}
              </div>
              <div style={{ fontSize: 40, color: "white", fontWeight: 600 }}>{it.v}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
