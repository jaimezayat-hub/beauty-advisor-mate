import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Scene0_Open } from "./scenes/Scene0_Open";
import { Scene1_Home } from "./scenes/Scene1_Home";
import { Scene2_Consumers } from "./scenes/Scene2_Consumers";
import { Scene3_Profile } from "./scenes/Scene3_Profile";
import { Scene4_Catalog } from "./scenes/Scene4_Catalog";
import { Scene5_Purchases } from "./scenes/Scene5_Purchases";
import { Scene6_Agenda } from "./scenes/Scene6_Agenda";
import { Scene7_Performance } from "./scenes/Scene7_Performance";
import { Scene8_Close } from "./scenes/Scene8_Close";
import { C } from "./theme";

const T = 20;

const tFade = () => ({
  presentation: fade(),
  timing: linearTiming({ durationInFrames: T }),
});
const tWipe = (dir: "from-left" | "from-right") => ({
  presentation: wipe({ direction: dir }),
  timing: linearTiming({ durationInFrames: T }),
});

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={280}>
          <Scene0_Open />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tFade()} />

        <TransitionSeries.Sequence durationInFrames={440}>
          <Scene1_Home />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tWipe("from-right")} />

        <TransitionSeries.Sequence durationInFrames={480}>
          <Scene2_Consumers />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tFade()} />

        <TransitionSeries.Sequence durationInFrames={440}>
          <Scene3_Profile />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tWipe("from-left")} />

        <TransitionSeries.Sequence durationInFrames={480}>
          <Scene4_Catalog />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tFade()} />

        <TransitionSeries.Sequence durationInFrames={380}>
          <Scene5_Purchases />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tWipe("from-right")} />

        <TransitionSeries.Sequence durationInFrames={440}>
          <Scene6_Agenda />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tFade()} />

        <TransitionSeries.Sequence durationInFrames={440}>
          <Scene7_Performance />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...tFade()} />

        <TransitionSeries.Sequence durationInFrames={380}>
          <Scene8_Close />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};