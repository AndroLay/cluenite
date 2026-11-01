// Authored case shape consumed by the deterministic engine. Case data lives in
// packages/cases and holds answers and proof requirements, so it must never reach the
// public web bundle. Only toRoundSnapshot() output (contracts) is viewer-safe.

export interface ClueNodeDef {
  id: string;
  label: string;
  teaser: string;
  // Shown to viewers after the first accepted inspect.
  observation: string;
  // Evidence IDs unlocked the first time this node is inspected.
  unlocks: readonly string[];
  // Co-op station clues are only visible to their assigned channel until shared.
  team?: "A" | "B";
}

export interface EvidenceDef {
  id: string;
  label: string;
  // Kind of proof this evidence supplies. Shown only when proof is missing.
  category: string;
  team?: "A" | "B";
}

export interface SequenceDef {
  id: string;
  label: string;
  expectedOrder: readonly string[];
  // Public, unordered choices for a timeline UI. The solution stays in expectedOrder.
  events?: readonly { id: string; label: string }[];
  requiredEvidence?: readonly string[];
  unlocks: readonly string[];
  successText: string;
}

export interface CodeDef {
  id: string;
  expectedCode: string;
  unlocks: readonly string[];
  successText: string;
}

export interface TheoryDef {
  id: string;
  label: string;
}

export interface ChallengeDef {
  id: string;
  theoryId: string;
  evidenceId: string;
  status: "CONTRADICTED" | "SUPPORTED";
  message: string;
  unlocks?: readonly string[];
}

export interface StationActionDef {
  verb: "scan" | "verify";
  targetId: string;
  team: "A" | "B";
  evidenceId: string;
  message: string;
}

export interface JointProofDef {
  relationId: string;
  evidenceFromA: string;
  evidenceFromB: string;
  evidenceId: string;
  message: string;
}

export interface ConnectionDef {
  a: string;
  b: string;
}

export interface ProofRequirement {
  evidence: readonly { id: string; category: string }[];
  links: readonly { a: string; b: string; category: string }[];
  sequences?: readonly string[];
  challenges?: readonly string[];
  sharedEvidence?: readonly string[];
}

export interface VerdictDef {
  id: string;
  label: string;
  aliases: readonly string[];
}

export interface CaseDefinition {
  id: string;
  version: number;
  mode: "quick" | "mystery" | "coop";
  title: string;
  premise: string;
  question: string;
  clues: readonly ClueNodeDef[];
  evidence: readonly EvidenceDef[];
  connections: readonly ConnectionDef[];
  verdicts: readonly VerdictDef[];
  acceptedVerdicts: readonly string[];
  falseVerdicts: readonly string[];
  proof: ProofRequirement;
  revealText: string;
  sequences?: readonly SequenceDef[];
  codes?: readonly CodeDef[];
  theories?: readonly TheoryDef[];
  challenges?: readonly ChallengeDef[];
  hints?: readonly string[];
  stationActions?: readonly StationActionDef[];
  jointProof?: JointProofDef;
}

export function connectionKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

const ID_PATTERN = /^[A-Z0-9_]{1,32}$/;

// Returns contradictions and dead references. A non-empty list means the case must not
// run; the engine answers CONTENT_ERROR instead of guessing.
export function validateCaseDefinition(def: CaseDefinition): string[] {
  const errors: string[] = [];
  if (!["quick", "mystery", "coop"].includes(def.mode)) {
    errors.push(`invalid mode ${String(def.mode)}`);
  }
  const nodeIds = new Set<string>();
  for (const node of def.clues) {
    if (!ID_PATTERN.test(node.id)) errors.push(`bad node id ${node.id}`);
    if (nodeIds.has(node.id)) errors.push(`duplicate node ${node.id}`);
    nodeIds.add(node.id);
  }

  const evidenceIds = new Set<string>();
  for (const item of def.evidence) {
    if (!ID_PATTERN.test(item.id)) errors.push(`bad evidence id ${item.id}`);
    if (evidenceIds.has(item.id)) errors.push(`duplicate evidence ${item.id}`);
    if (nodeIds.has(item.id))
      errors.push(`evidence ${item.id} collides with a node`);
    evidenceIds.add(item.id);
  }

  for (const node of def.clues) {
    for (const id of node.unlocks) {
      if (!evidenceIds.has(id)) errors.push(`${node.id} unlocks unknown ${id}`);
    }
  }

  const connections = new Set<string>();
  for (const link of def.connections) {
    if (
      link.a === link.b ||
      !evidenceIds.has(link.a) ||
      !evidenceIds.has(link.b)
    ) {
      errors.push(`invalid connection ${link.a}|${link.b}`);
    }
    connections.add(connectionKey(link.a, link.b));
  }

  for (const req of def.proof.evidence) {
    if (!evidenceIds.has(req.id)) errors.push(`proof needs unknown ${req.id}`);
  }
  for (const req of def.proof.links) {
    if (!connections.has(connectionKey(req.a, req.b))) {
      errors.push(`proof link ${req.a}|${req.b} is not a declared connection`);
    }
  }

  const sequenceIds = new Set<string>();
  for (const sequence of def.sequences ?? []) {
    if (!ID_PATTERN.test(sequence.id))
      errors.push(`bad sequence id ${sequence.id}`);
    if (sequenceIds.has(sequence.id))
      errors.push(`duplicate sequence ${sequence.id}`);
    sequenceIds.add(sequence.id);
    if (
      sequence.expectedOrder.length < 2 ||
      new Set(sequence.expectedOrder).size !== sequence.expectedOrder.length
    ) {
      errors.push(`invalid sequence order ${sequence.id}`);
    }
    const eventIds = new Set<string>();
    for (const event of sequence.events ?? []) {
      if (!ID_PATTERN.test(event.id))
        errors.push(`bad sequence event id ${event.id}`);
      if (eventIds.has(event.id))
        errors.push(`duplicate sequence event ${event.id}`);
      eventIds.add(event.id);
    }
    if (
      eventIds.size > 0 &&
      sequence.expectedOrder.some((eventId) => !eventIds.has(eventId))
    ) {
      errors.push(
        `sequence ${sequence.id} has an event missing from its choices`,
      );
    }
    for (const id of sequence.unlocks) {
      if (!evidenceIds.has(id))
        errors.push(`${sequence.id} unlocks unknown ${id}`);
    }
    for (const id of sequence.requiredEvidence ?? []) {
      if (!evidenceIds.has(id))
        errors.push(`${sequence.id} requires unknown ${id}`);
    }
  }
  for (const id of def.proof.sequences ?? []) {
    if (!sequenceIds.has(id)) errors.push(`proof needs unknown sequence ${id}`);
  }

  const codeIds = new Set<string>();
  const expectedCodes = new Set<string>();
  for (const code of def.codes ?? []) {
    if (!ID_PATTERN.test(code.id)) errors.push(`bad code id ${code.id}`);
    if (codeIds.has(code.id)) errors.push(`duplicate code ${code.id}`);
    codeIds.add(code.id);
    if (expectedCodes.has(code.expectedCode))
      errors.push(`duplicate code value ${code.id}`);
    expectedCodes.add(code.expectedCode);
    if (!/^[A-Z0-9]{1,16}$/.test(code.expectedCode))
      errors.push(`invalid code ${code.id}`);
    for (const id of code.unlocks) {
      if (!evidenceIds.has(id)) errors.push(`${code.id} unlocks unknown ${id}`);
    }
  }

  const theoryIds = new Set<string>();
  for (const theory of def.theories ?? []) {
    if (!ID_PATTERN.test(theory.id)) errors.push(`bad theory id ${theory.id}`);
    if (theoryIds.has(theory.id)) errors.push(`duplicate theory ${theory.id}`);
    theoryIds.add(theory.id);
  }

  const challengeIds = new Set<string>();
  const challengeOutcomes = new Map<string, ChallengeDef["status"]>();
  for (const challenge of def.challenges ?? []) {
    if (!ID_PATTERN.test(challenge.id))
      errors.push(`bad challenge id ${challenge.id}`);
    if (challengeIds.has(challenge.id))
      errors.push(`duplicate challenge ${challenge.id}`);
    challengeIds.add(challenge.id);
    if (!theoryIds.has(challenge.theoryId))
      errors.push(`${challenge.id} needs unknown theory ${challenge.theoryId}`);
    if (!evidenceIds.has(challenge.evidenceId))
      errors.push(
        `${challenge.id} needs unknown evidence ${challenge.evidenceId}`,
      );
    const existingOutcome = challengeOutcomes.get(challenge.theoryId);
    if (existingOutcome && existingOutcome !== challenge.status) {
      errors.push(
        `theory ${challenge.theoryId} has conflicting challenge outcomes`,
      );
    }
    challengeOutcomes.set(challenge.theoryId, challenge.status);
    for (const id of challenge.unlocks ?? []) {
      if (!evidenceIds.has(id))
        errors.push(`${challenge.id} unlocks unknown ${id}`);
    }
  }
  for (const id of def.proof.challenges ?? []) {
    if (!challengeIds.has(id))
      errors.push(`proof needs unknown challenge ${id}`);
  }

  for (const id of def.proof.sharedEvidence ?? []) {
    if (!evidenceIds.has(id))
      errors.push(`proof needs unknown shared evidence ${id}`);
  }

  const stationActions = new Set<string>();
  for (const action of def.stationActions ?? []) {
    const key = `${action.verb}:${action.targetId}`;
    if (stationActions.has(key)) errors.push(`duplicate station action ${key}`);
    stationActions.add(key);
    if (!evidenceIds.has(action.evidenceId))
      errors.push(`${key} creates unknown evidence ${action.evidenceId}`);
    const evidence = def.evidence.find((item) => item.id === action.evidenceId);
    if (evidence?.team !== action.team)
      errors.push(`${key} team does not match evidence ${action.evidenceId}`);
  }

  if (def.mode === "coop" && !def.jointProof)
    errors.push("co-op case needs joint proof");
  if (def.mode !== "coop" && def.jointProof)
    errors.push("joint proof is only valid for co-op cases");
  if (def.jointProof) {
    const { evidenceFromA, evidenceFromB, evidenceId } = def.jointProof;
    const fromA = def.evidence.find((item) => item.id === evidenceFromA);
    const fromB = def.evidence.find((item) => item.id === evidenceFromB);
    if (fromA?.team !== "A")
      errors.push(`joint proof source ${evidenceFromA} is not Team A evidence`);
    if (fromB?.team !== "B")
      errors.push(`joint proof source ${evidenceFromB} is not Team B evidence`);
    if (!evidenceIds.has(evidenceId))
      errors.push(`joint proof creates unknown evidence ${evidenceId}`);
    if (def.proof.evidence.every((item) => item.id !== evidenceId))
      errors.push(
        `joint proof evidence ${evidenceId} is not required for proof`,
      );
    if (
      !(def.stationActions ?? []).some(
        (item) => item.team === "A" && item.evidenceId === evidenceFromA,
      )
    ) {
      errors.push(`joint proof source ${evidenceFromA} has no Team A action`);
    }
    if (
      !(def.stationActions ?? []).some(
        (item) => item.team === "B" && item.evidenceId === evidenceFromB,
      )
    ) {
      errors.push(`joint proof source ${evidenceFromB} has no Team B action`);
    }
  }

  for (const [index, hint] of (def.hints ?? []).entries()) {
    if (typeof hint !== "string" || hint.length < 1 || hint.length > 500) {
      errors.push(`invalid hint ${index + 1}`);
    }
  }

  const verdictTokens = new Map<string, string>();
  for (const verdict of def.verdicts) {
    for (const token of [verdict.id, ...verdict.aliases]) {
      const owner = verdictTokens.get(token);
      if (owner && owner !== verdict.id)
        errors.push(`verdict token ${token} is ambiguous`);
      verdictTokens.set(token, verdict.id);
    }
  }
  const verdictIds = new Set(def.verdicts.map((verdict) => verdict.id));
  if (def.acceptedVerdicts.length === 0) errors.push("no accepted verdict");
  for (const id of def.acceptedVerdicts) {
    if (!verdictIds.has(id))
      errors.push(`accepted verdict ${id} is not a choice`);
    if (def.falseVerdicts.includes(id))
      errors.push(`verdict ${id} is both accepted and false`);
  }
  for (const id of def.falseVerdicts) {
    if (!verdictIds.has(id)) errors.push(`false verdict ${id} is not a choice`);
  }
  for (const verdict of def.verdicts) {
    if (
      !def.acceptedVerdicts.includes(verdict.id) &&
      !def.falseVerdicts.includes(verdict.id)
    ) {
      errors.push(`verdict ${verdict.id} is neither accepted nor false`);
    }
  }

  return errors;
}
