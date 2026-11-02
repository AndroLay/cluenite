# Shared contracts

`src/index.ts` defines Zod schemas and exported wire types for commands/results, host controls, case/session IDs, Twitch identities/envelopes, invitations, connection status, public snapshots, and revision deltas.

Both apps consume these contracts. Browser payloads never define accepted proof, team membership, or Twitch actor identity. Public snapshots omit private answers, expected sequence order, and proof predicates.

Preserve compatibility when adding fields or result codes. Update [the API handoff](../../docs/api.md), affected producers/consumers, and boundary tests together. English is the language for schema comments, human-readable errors, and examples; identifiers remain unchanged.

Optional Socket.IO `idempotencyKey` supports exact retries. The current web round client omits it, so the backend's keyless compatibility path is not retry-safe. See [current status](../../docs/STATUS.md).
