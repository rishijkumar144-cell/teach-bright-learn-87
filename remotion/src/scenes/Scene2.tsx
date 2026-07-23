import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { FONTS } from "../MainVideo";

const features = [
  { icon: "🎨", title: "Drag-and-drop builder", desc: "Compose lessons in minutes" },
  { icon: "🧩", title: "Interactive diagrams", desc: "Graphs, geometry, coordinate planes" },
  { icon: "🔗", title: "One shareable link", desc: "Students click and start" },
];

export const Scene2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 200 } });
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
          opacity: titleS,
          transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          letterSpacing: -2,
        }}
      >
        Everything you need.
      </h2>
      {features.map((f, i) => {
        const delay = 15 + i * 18;
        const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
        return (
          <div
            key={f.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              padding: 32,
              marginBottom: 24,
              borderRadius: 28,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(0px)",
              transform: `translateX(${interpolate(s, [0, 1], [-80, 0])}px)`,
              opacity: s,
            }}
          >
            <div
              style={{
                fontSize: 64,
                width: 96,
                height: 96,
                display: "grid",
                placeItems: "center",
                borderRadius: 20,
                background: "linear-gradient(135deg,#a78bfa,#7c3aed)",
              }}
            >
              {f.icon}
            </div>
            <div>
              <div style={{ fontFamily: FONTS.display, fontSize: 42, color: "white", fontWeight: 700 }}>{f.title}</div>
              <div style={{ fontSize: 28, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>{f.desc}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
