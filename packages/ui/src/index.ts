import "./tokens/tokens.css";

export type UiSurface = "accessible-dom";

export { createSfxPlayer } from "./audio/sfx";
export type { SfxCue, SfxPlayer } from "./audio/sfx";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
