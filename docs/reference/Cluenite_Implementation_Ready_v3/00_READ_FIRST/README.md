# CLUENITE — Implementation-Ready Master Pack v3.0

**Date:** 2026-10-31 (WITA)  
**Status:** design/specification package; **not** proof of a working Twitch deployment, production game, or completed submission.  
**Project:** Cluenite (working product name; trademark/domain not certified).  
**Tagline:** *Every Clue Brings Us Together.*  
**Primary context:** Codex × TwitchCon Hackathon 2026.  
**Hosting decision:** Render, replacing Railway.

## Mission — immutable

Build a delightful, stream-native social detective/puzzle experience where **streamers and actual Twitch viewers** discover evidence, reason about what happened, refute assumptions, and solve small or larger mysteries **together**. An ordinary gaming streamer should be able to launch a tiny puzzle in OBS during downtime **without leaving their main game**. A dedicated stream can expand the same evidence-and-proof engine into a longer investigative event. Two consenting streamer communities can investigate in parallel and earn a real cross-community breakthrough.

The key emotion is **curiosity → small discovery → discussion → surprising but fair revelation → shared satisfaction**, not math homework, high-pressure competition, mystery fatigue, or a chatbot reading generic riddles.

## Priority and document precedence

**Latest v3 files are controlling.** If an older blueprint or architecture document differs, use this priority: `00_READ_FIRST` decisions > v3 gameplay/contracts/delivery > `05_REFERENCE/ARCHITECTURE_v2_1_RENDER.md` for deep technical rationale > `05_REFERENCE/BLUEPRINT_v1/` for detailed assets/case data/older design examples. Old cases remain **examples**, not immutable production truth; verify and adapt them before use. Do not copy older P0/P1 assertions uncritically.

Read in this order:

1. `00_READ_FIRST/README.md` and `PROJECT_DECISIONS_AND_NON_GOALS.md`.
2. `01_PRODUCT_GAMEPLAY/01_PRODUCT_REQUIREMENTS.md` — user journeys and success conditions.
3. `01_PRODUCT_GAMEPLAY/02_GAMEPLAY_AND_CASES.md` — rules and executable examples of play.
4. `01_PRODUCT_GAMEPLAY/03_INTERACTION_AND_COOP.md` — exact inter-player collaboration and fair chat behavior.
5. `02_DESIGN_CONTENT/04_UI_ART_MOTION_AUDIO.md` — screens, visual language, animation and art production.
6. `02_DESIGN_CONTENT/05_CASE_DATA_AND_CONTENT_PIPELINE.md` — cases/proof/asset mapping.
7. `03_ENGINEERING/06_SYSTEM_ARCHITECTURE.md`, `07_TWITCH_API_AND_PROTOCOL.md`, `08_DATA_AND_SECURITY.md`, `09_RENDER_AND_OPERATIONS.md`.
8. `04_EXECUTION_SUBMISSION/10_CODEX_IMPLEMENTATION_PLAN.md`, `11_QA_ACCEPTANCE_AND_PLAYTESTS.md`, `12_DEMO_SUBMISSION.md`, `CODEX_EXECUTION_PROMPT.md`.

## Two tracks (do not confuse)

- **Product vision:** Quick Cases + long Mystery Live + actual 2-streamer Cooperative Mystery + future content library, optional relay, autonomous BRB, AI-assisted verified authoring. These describe what the product could become.
- **Hackathon P0:** one properly working authenticated Twitch host, EventSub chat, one case fully playable using real chat, validated server-side proof, OBS overlay update/reveal, a compact and a short multi-step presentation, documented reliable test and submission. **Co-op is P1 stretch**: only claim it if two real authorized channels have been verified end to end.

## Absolutely non-negotiable

- Truth is decided by authored proof requirements, **not** by voting or LLM semantic guessing.
- An incorrect theory does not terminate or humiliate a player; evidence-driven correction is fun.
- One live viewer can make meaningful progress. Avoid subscriber-only privileges, paid votes, synthetic viewers and fabricated demo events.
- Chat messages are normalized and deduplicated; repeated spam is never weighted as proof.
- Quick cases can pause, cancel or collapse immediately as main-game matchmaking ends.
- Longer cases include hints, recap, checkpointing and a low-cognitive-load interface.
- Twitch credentials never enter browser bundles or public repos; OBS access is scoped and revocable.
- Case definitions are versioned, validated, and immutable per session; invalid content never produces fabricated wins.
- Use original/licensed artwork, sound and demo media; do not ship unlicensed assets.
- All hackathon submission claims must reflect **implemented and verified** features.

## Most important distinction

The documents are deliberately complete, but **the build order is narrow**. Do not treat every design section as something that must be built before the hackathon deadline. Build the only thing judges can evaluate: a polished, real, reproducible Twitch interaction.

## Verified official sources (as of this drafting)

- Hackathon rules and requirements: https://twitchcon-codex.devpost.com/rules
- Twitch EventSub subscription types: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
- Twitch EventSub WebSocket lifecycle: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- Twitch OAuth: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
- Render WebSockets: https://render.com/docs/websocket
- Render Free plan limitations: https://render.com/docs/free

**Deadline:** Nov 2 2026 14:00 PST = **Nov 3 2026 06:00 WITA**. Period: Oct 23–Nov 2, 2026. Only newly built eligible project work should be represented as submitted code. See official rules for current authoritative language.
