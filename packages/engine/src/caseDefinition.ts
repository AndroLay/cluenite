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
}

export interface EvidenceDef {
  id: string;
  label: string;
  // Kind of proof this evidence supplies. Shown only when proof is missing.
  category: string;
}

export interface ConnectionDef {
  a: string;
  b: string;
}

export interface ProofRequirement {
  evidence: readonly { id: string; category: string }[];
  links: readonly { a: string; b: string; category: string }[];
}

export interface VerdictDef {
  id: string;
  label: string;
  aliases: readonly string[];
}

export interface CaseDefinition {
  id: string;
  version: number;
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
}

export function connectionKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

const ID_PATTERN = /^[A-Z0-9_]{1,32}$/;

// Returns contradictions and dead references. A non-empty list means the case must not
// run; the engine answers CONTENT_ERROR instead of guessing.
export function validateCaseDefinition(def: CaseDefinition): string[] {
  const errors: string[] = [];
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
    if (nodeIds.has(item.id)) errors.push(`evidence ${item.id} collides with a node`);
    evidenceIds.add(item.id);
  }

  for (const node of def.clues) {
    for (const id of node.unlocks) {
      if (!evidenceIds.has(id)) errors.push(`${node.id} unlocks unknown ${id}`);
    }
  }

  const connections = new Set<string>();
  for (const link of def.connections) {
    if (link.a === link.b || !evidenceIds.has(link.a) || !evidenceIds.has(link.b)) {
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

  const verdictTokens = new Map<string, string>();
  for (const verdict of def.verdicts) {
    for (const token of [verdict.id, ...verdict.aliases]) {
      const owner = verdictTokens.get(token);
      if (owner && owner !== verdict.id) errors.push(`verdict token ${token} is ambiguous`);
      verdictTokens.set(token, verdict.id);
    }
  }
  const verdictIds = new Set(def.verdicts.map((verdict) => verdict.id));
  if (def.acceptedVerdicts.length === 0) errors.push("no accepted verdict");
  for (const id of def.acceptedVerdicts) {
    if (!verdictIds.has(id)) errors.push(`accepted verdict ${id} is not a choice`);
    if (def.falseVerdicts.includes(id)) errors.push(`verdict ${id} is both accepted and false`);
  }
  for (const id of def.falseVerdicts) {
    if (!verdictIds.has(id)) errors.push(`false verdict ${id} is not a choice`);
  }
  for (const verdict of def.verdicts) {
    if (!def.acceptedVerdicts.includes(verdict.id) && !def.falseVerdicts.includes(verdict.id)) {
      errors.push(`verdict ${verdict.id} is neither accepted nor false`);
    }
  }

  return errors;
}
