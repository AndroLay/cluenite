import type { CaseDefinition } from "@cluenite/engine";
import { C01_HARBOR_SIGNAL } from "./c01HarborSignal.js";
import { M01_MISSING_TROPHY } from "./m01MissingTrophy.js";
import { Q01_GALLERY_SHADOW } from "./q01GalleryShadow.js";

export type AuthoredCaseReference = {
  id: string;
  version: number;
};

export { Q01_GALLERY_SHADOW };
export { M01_MISSING_TROPHY, C01_HARBOR_SIGNAL };

// Registry of authored rounds. Server code picks a case by ID; nothing else in the
// repo should read the answers.
export const AUTHORED_CASES: readonly CaseDefinition[] = [
  Q01_GALLERY_SHADOW,
  M01_MISSING_TROPHY,
  C01_HARBOR_SIGNAL,
];

export function findAuthoredCase(id: string): CaseDefinition | undefined {
  return AUTHORED_CASES.find((item) => item.id === id);
}
