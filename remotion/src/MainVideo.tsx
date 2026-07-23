import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { loadFont as loadDisplay } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

const { fontFamily: display } = loadDisplay("normal", { weights: ["700", "800"], subsets: ["latin"] });
const { fontFamily: body } = loadBody("normal", { weights: ["400", "600"], subsets: ["latin"] });

export const FONTS = { display, body };

function Stars() {
  const frame = useCurrentFrame();
  const stars = Array.from({ length: 60 }, (_, i) => {
    const seed = i * 9301 + 49297;
    const x = (seed % 1080);
    const y = ((seed * 7) % 1350);
    const s = 1 + ((i * 13) % 3);
    const tw = 0.3 + 0.7 * Math.abs(Math.sin((frame + i * 5) / 20));
    return <circle key={i} cx={x} cy={y} r={s} fill="white" opacity={tw} />;
  });
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="1080" height="1350">
      {stars}
    </svg>
  );
}

export const MainVideo = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Persistent animated gradient background
  const hue = interpolate(frame, [0, durationInFrames], [265, 305]);
  return (
    <AbsoluteFill style={{ fontFamily: body }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 900px at 30% 20%, hsl(${hue} 70% 35%), hsl(${hue + 20} 60% 12%) 60%, #0a0616 100%)`,
        }}
      />
      <Stars />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })} />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })} />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene3 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })} />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene4 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })} />
        <TransitionSeries.Sequence durationInFrames={240}>
          <Scene5 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
