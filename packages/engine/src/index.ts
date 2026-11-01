export type EngineBoundary = "deterministic-server-authority";

export {
  connectionKey,
  validateCaseDefinition,
  type CaseDefinition,
  type ChallengeDef,
  type ClueNodeDef,
  type CodeDef,
  type ConnectionDef,
  type EvidenceDef,
  type JointProofDef,
  type ProofRequirement,
  type SequenceDef,
  type StationActionDef,
  type TheoryDef,
  type VerdictDef,
} from "./caseDefinition.js";

export {
  applyCommand,
  createRound,
  parseCommand,
  restartRound,
  setPaused,
  toRoundSnapshot,
  type CommandActor,
  type CommandContext,
  type RoundClock,
  type RoundSource,
  type RoundState,
  type Transition,
} from "./round.js";
