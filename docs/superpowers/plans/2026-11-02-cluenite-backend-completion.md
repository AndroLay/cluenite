# Cluenite Backend Completion Plan

> Historical implementation plan. Its requirements, checkboxes, authorization, and source precedence belong to the recorded execution. For current work, read [the documentation map](../../README.md), [status](../../STATUS.md), and [current decisions](../../architecture/DECISIONS.md). Do not repeat completed work or carry old permissions into a new task.

## Target

Complete backend implementation for the v3 single-broadcaster P0 loop, the short
M01 Mystery Live case, and the C01 two-broadcaster co-op backend. Implement and
verify the code locally without claiming real Twitch or Render acceptance.

## Constraints

- PostgreSQL remains authoritative; engine rules stay deterministic and provider-free.
- Preserve the existing Q01 API and persisted session compatibility.
- All Twitch chat actions remain EventSub-only. Team/channel identity comes from
  persisted channel membership, never from browser claims.
- C01 requires two distinct, OAuth-authorized broadcaster accounts and explicit
  invitation acceptance. Mocked tests do not count as live co-op verification.
- Do not deploy, contact Twitch, provision paid infrastructure, or expose secret
  values as part of this implementation.

## Workstreams

1. **Engine and content:** add bounded contracts for case-local commands; expand
   deterministic state for sequence, theory/challenge, hint, and station-proof
   actions; author the short M01 path and C01 scan/verify/shared proof path; keep
   answer and proof data out of public snapshots.
2. **Persistence and co-op:** add backward-compatible state hydration, channel
   membership, invite lifecycle (create/accept/decline/expiry), team-aware chat
   routing, per-team overlay projections, and joint proof/outbox transitions.
3. **Twitch and operations:** add explicit authorization revocation, truthful
   connection health, safe EventSub failure recovery, and a PostgreSQL leader
   epoch so stale workers cannot commit viewer input after ownership changes.
4. **Evidence:** add engine, repository, HTTP authorization, realtime, and provider
   tests; run focused tests, PostgreSQL integration tests, typecheck, build,
   formatting, and diff review; update the backend status and operator docs.

## Acceptance

- Q01 proof still needs both inspections, the authored link, and the correct
  verdict; malformed and duplicate input cannot advance revision.
- M01 requires the authored event order, corroborating evidence, and supported
  safety-move verdict; an unsupported theft claim never resolves it.
- C01 cannot be created as a completed joint case without a second distinct
  broadcaster accepting the invitation; A-only or B-only evidence cannot unlock
  the joint proof; both authentic station outputs produce exactly one proof.
- Host, co-host, team overlay, and general overlay permissions are enforced in
  HTTP and Socket.IO; revoked credentials stop receiving updates.
- Existing v1 persisted Q01 state hydrates with defaults for added fields.
- Tests use isolated PostgreSQL schemas; no main application schema migration or
  external account mutation occurs during verification.

## Verification boundary

Implementation and automated local acceptance can be completed here. Real
Twitch authorization, separate live broadcaster channels, actual OBS gameplay,
Render deployment, player playtest, and submission require separate external
evidence and remain unverified until performed by the owner.

## Completion evidence

- [x] Q01, M01, and C01 deterministic rules and public snapshots.
- [x] PostgreSQL persistence, co-op membership, invitation
      accept/decline/expiry/rejoin, team projections, outbox, and leader fencing.
- [x] OAuth disconnect and token revocation handling.
- [x] Host-scoped operational diagnostics for EventSub subscription health,
      last notification, session revisions, pending outbox, and database readiness.
- [x] Interrupted runs persist as `PARTIAL` only after meaningful investigation;
      empty starts remain `CANCELLED` and never expose a solution.
- [x] Socket.IO publishes team-filtered, event-ID-bearing revision deltas;
      clients request an authorized snapshot after a detected revision gap, and
      Twitch connection state is sent to joined clients and on status changes.
- [x] Full local test suite, typecheck, production build, targeted formatting,
      and diff review. The suite uses an isolated PostgreSQL schema and mocked
      Twitch boundaries.
- [x] Operator and implementation status documents updated with remaining live
      Twitch, OBS, Render, and player-playtest verification gaps.
