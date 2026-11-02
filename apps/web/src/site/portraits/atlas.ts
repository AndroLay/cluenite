import atlas from "./cast-atlas-v1.png";
import type { Portrait } from "../../sampleCase/boardCases";

export const CAST_ATLAS = atlas;
export const CAST_CELLS: Record<Portrait, readonly [number, number]> = {
  hat: [0, 0], cap: [1, 0], bun: [2, 0], beard: [0, 1], scarf: [1, 1], bob: [2, 1],
};
export const MANUSCRIPT_PORTRAITS = { GARDENER: "cap", GUEST: "scarf", CLERK: "bob" } as const;
