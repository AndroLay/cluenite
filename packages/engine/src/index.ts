export type EngineBoundary = "deterministic-server-authority";

export {
  connectionKey,
  validateCaseDefinition,
  type CaseDefinition,
  type ClueNodeDef,
  type ConnectionDef,
  type EvidenceDef,
  type ProofRequirement,
  type VerdictDef,
} from "./caseDefinition.js";

export {
  applyCommand,
  createRound,
  parseCommand,
  restartRound,
  setPaused,
  toRoundSnapshot,
  type RoundSource,
  type RoundState,
  type Transition,
} from "./round.js";
