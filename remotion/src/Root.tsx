import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// Sum of sequences: 280+440+480+440+480+380+440+440+380 = 3760
// Minus 8 transitions of 20f = 160 → visible: 3600 frames = 120s @ 30fps
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={3600}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);