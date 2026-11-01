# Project Decisions, Scope Gates, and Non-Goals

## ADR-001 Product identity

Name: **Cluenite** (working until formal clearance). Genre: approachable, playful **social detective mystery and puzzle**. Format: Twitch-integrated web application plus OBS browser overlay. Three experiences share the same case engine: **Quick Case**, **Mystery Live**, and **Co-op Mystery** (a variant of Mystery Live). The two first experiences must work with one authenticated streamer and ≥1 real chat participant; co-op requires two consenting authenticated broadcasters.

## ADR-002 Signature gameplay

**Observe → Connect → Challenge → Reveal.** It is a reasoning pattern, **not a rigid four-click sequence**. The truly distinctive Twitch moment is a **viewer-originated finding** that invalidates a popular but unproven theory, followed by a visible, fair reveal. Co-op's highlight is a **Cross-Community Breakthrough** where independent station contributions combine into one justified proof.

## ADR-003 Emotion and difficulty

Friendly, curious, light, surprising, cozy; **not** grim, gore, jumpscares, high-stakes timer pressure or scholastic Boolean worksheets. Most quick rounds show one objective and 2–4 salient clues/actions. Long scenes ideally present 3–6 inspectables, one focal objective, short recaps, staged hints and reachable checkpoints. No answer-quality shaming.

## ADR-004 Rendering

Vue 3 + TypeScript strict + Vite + CSS/HTML/SVG for interactive text/accessibility. PixiJS 8 for illustrated interactive 2D scenes where useful, GSAP for orchestrated visuals; do **not** force every overlay to initialize a GPU canvas. OBS rendering on demand with adaptive effects and reduced motion. Original stylized cinematic cozy-mystery art, readable after downscaling and stream compression.

## ADR-005 Backend/hosting

Node.js LTS + Fastify, custom deterministic pure TypeScript engine, Zod boundary validation, Drizzle ORM, PostgreSQL, Socket.IO for browser clients, Twitch OAuth + EventSub, single-instance Render **paid always-on Web Service** in Singapore + same-region paid Render Postgres. pnpm workspaces monorepo. No Redis or microservices at hackathon scale; event delivery still designed for future multi-instance readiness.

## ADR-006 Infrastructure guarantees

Database-authoritative state, per-session serialization, revisioned snapshots, deduplication keys, transactional outbox, least privilege. Reconnect always fetches authoritative snapshot; Socket.IO replay is a convenience, not persistent truth. EventSub WebSocket can lose messages on disconnection; explain degraded state rather than inventing event history.

## ADR-007 Player identity

Host uses Twitch OAuth; viewers use their normal Twitch chat and require **no additional login**. Backend knows broadcaster ID, chatting user ID, source channel ID, actual Twitch message ID. Co-op require invitation + explicit opt-in; no accidental raid takeover.

## Hard non-goals for hackathon

- Full AI-generated mystery authoring, free-form NPC dialogue judged by AI, thousands of cases.
- Paid unlocks, follower/subscriber gates, leaderboard arms races, rewards determined by who spams fastest.
- Native install, Unity/Godot runtime, photorealism, full character animation, three-dimensional world.
- Hundreds of realtime socket replicas, Kubernetes, event bus cluster, migration to Rust for premature optimization.
- Twitch Raid relay, unattended autonomous viewer campaigns, persistent social platform and marketplace.
- Pretending prototype chat adapters or simulated second streamer counts as production Twitch integration.

## Scope and cut order

P0 — **single authentic chat → valid discovery → PostgreSQL → OBS overlay reveal**, plus a short playable multi-step case, test instructions, original assets, Codex evidence, YouTube demo. Minimum to demonstrate signature insight: viewer action changes logical proof, not a poll.

P1 — second streamer OAuth, invite, two live chat subscriptions, true complementary station actions, one cross-community breakthrough, second channel recap. Co-op P1 becomes P0 **only** after the single-stream vertical slice is stable and there is actually time to test it.

P2 — expanded authored content library, BRB autonomous mode, relay, case editor, analytics.

P3 — AI-assisted case creation with offline validation and human editorial approval; scaling beyond single Render instance.

Cut optional SFX, extra art, extra case variations, fancy camera moves, advanced Co-op **before** cutting actual Twitch integration, deterministic truth, readable overlay or documented demo.

## Source of truth and open decisions

- This document locks product **direction**, not guaranteed playtest outcomes.
- Case example content should remain deterministic and easy to fix. A provided scene may be adjusted if playtest reveals ambiguity or lack of fun.
- Exact frames/animation timings are targets requiring visual review, not promises across every browser/device.
- Trademark/domain for Cluenite, billing credits/remaining amounts, Twitch app approval and actual deployment state remain unverified and require user-side action.
