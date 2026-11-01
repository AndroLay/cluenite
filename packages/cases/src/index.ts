import type { CaseDefinition } from "@cluenite/engine";
import { Q01_GALLERY_SHADOW } from "./q01GalleryShadow.js";

export type AuthoredCaseReference = {
  id: string;
  version: number;
};

export { Q01_GALLERY_SHADOW };

// Registry of authored rounds. Server code picks a case by ID; nothing else in the
// repo should read the answers.
export const AUTHORED_CASES: readonly CaseDefinition[] = [Q01_GALLERY_SHADOW];

export function findAuthoredCase(id: string): CaseDefinition | undefined {
  return AUTHORED_CASES.find((item) => item.id === id);
}
