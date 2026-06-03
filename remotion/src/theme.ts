export const C = {
  black: "#0A0A0A",
  ink: "#1A1612",
  cream: "#F5F0E8",
  paper: "#EDE6DA",
  gold: "#C9A84C",
  goldLight: "#E0C677",
  nude: "#D4A5A5",
  rose: "#B87A7A",
  green: "#7A8F6E",
  red: "#C04A3A",
  muted: "#8A8378",
};

import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const display = loadCormorant("normal", { weights: ["300", "400", "500", "600"] }).fontFamily;
export const displayItalic = loadCormorant("italic", { weights: ["300", "400"] }).fontFamily;
export const body = loadInter("normal", { weights: ["300", "400", "500", "600", "700"] }).fontFamily;