import type { SuspectId } from "../sampleCase/manuscript";

// Layout numbers shared by the study scene and the page around it. Kept apart from studyScene.ts so the page can
// place its hotspot buttons and name tags without pulling PixiJS into its own bundle.

export const DESIGN_W = 1600;
export const DESIGN_H = 900;

/** Where the page pins each suspect's name tag, in design units (the point under the figure's feet). */
export const SUSPECT_ANCHORS: Record<SuspectId, { x: number; y: number }> = {
  GARDENER: { x: 432, y: 708 },
  GUEST: { x: 972, y: 728 },
  CLERK: { x: 1418, y: 668 },
};

/** Camera transform from design units to CSS pixels inside the stage box: x' = tx + x * k. */
export interface StageTransform {
  tx: number;
  ty: number;
  k: number;
}
