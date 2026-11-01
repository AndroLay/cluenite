# CLUENITE — Complete Game, Art, Motion & Engineering Blueprint

**Version:** 1.0 | **Planning date:** 31 October 2026 | **Language:** Indonesia (technical keys in English)  
**Product:** Cluenite, tentative name pending trademark/domain clearance. **State:** design deliverables, not implemented software or a live Twitch integration.  
**Tagline:** *Every Clue Brings Us Together.*

## Read in this exact order

1. `01_GAMEPLAY/01_PRODUCT_VISION.md` — why this game is fun and what is/isn't promised.
2. `01_GAMEPLAY/02_MECHANICS_RULEBOOK.md` — complete rules, input, states, rewards, hints, failure handling.
3. `01_GAMEPLAY/03_VIEWER_STREAMER_INTERACTIONS.md` — every relationship: viewer ↔ streamer, chat ↔ chat, channel ↔ channel.
4. `01_GAMEPLAY/04_QUICK_CASE_FLOW.md` + `05_LONG_MYSTERY_FLOW.md` + `06_COOP_FLOW.md` — three playable rhythms.
5. `02_PLAYABLE_CASES/` — authored, deterministic example cases with evidence, truth, commands, branching and reveals.
6. `03_ART_AND_MOTION/` — art style, color/tokens, UI scene layouts, animation timing, FX/audio, asset inventory.
7. `06_VISUAL_PREVIEWS/` — actual preview boards (SVG + PNG), plus GIF examples of motion; **concept mockups** only.
8. `04_TECHNICAL/` — architecture, state, data, protocol, Twitch authorization, OBS, security, tests.
9. `05_DELIVERY/` — build sequence, Codex kickoff, hackathon demo, official compliance checklist.

## One-sentence pitch

A Twitch-native social detective game that turns a spare minute into a delightful evidence-based puzzle, and turns two streamers plus their communities into a shared investigation team for bigger mysteries.

## Product constants (do not accidentally change across files)

- Two presentation profiles using the **same case engine**: **Quick Case** (~30–90 seconds, aspirational) and **Mystery Live** (~20–60+ minutes, aspirational).
- **Co-op Mystery** = Mystery Live session shared by two authenticated broadcasters, **not** a third game engine.
- Signature discovery loop: **Observe → Connect → Challenge → Reveal**, steps may be omitted or repeated according to case.
- Signature co-op moment: **Cross-Community Breakthrough**, where clues or tools from two workstations jointly establish a verified conclusion.
- **No arbitrary voting-as-truth**; evidence determines correctness. Votes can guide navigation only.
- Viewers participate through existing Twitch chat; streamer gets web dashboard; OBS uses browser source; case server authoritative.
- Case data includes **truth + proof requirements + counterexamples + reveal**; zero unverified auto-published generative cases.
- Wrong reasoning is safe; no public shame, personal attacks or punitive "you failed" screens.
- Co-op never requires secret evidence to stay secret across public broadcasts.
- Single-viewer mode playable. One viewer can solve a single-stream case. Co-op requires two consenting broadcaster accounts only in the optional co-op-specific mode.
- Stream delays vary. Don't reward millisecond fastest typing as the sole mechanic. Host may pause/abort without losing completed checkpoints.
- Artwork: **illustrated cinematic cozy mystery**, legible warm noir, not gritty crime/horror and not complex 2D character sprite animation.

## Scope labels

- **P0 / submit:** genuine Twitch integration; host auth; one usable overlay; one complete quick case; one complete short multi-step mystery; server checks, replay, error handling, setup instructions and English submission materials.
- **P1 / high-value stretch:** second streamer invite/consent, dual workstation, one shared breakthrough, more quick cases, recap polish.
- **P2 / later:** larger authored library, BRB-autonomous, raid handoff, robust editor and content operations.
- **P3 / later:** AI-assisted case authoring with automated proofs and human review, creator marketplace, advanced community tools.

**Important:** The documents describe full product vision and examples. Only items marked P0 are mandatory for the immediate hackathon vertical slice. Full vision is not a claim of completed functionality.

## Files manifest

All authoritative documents use relative links. JSON in `07_DATA_FIXTURES` is example content and schemas, not a production-ready server. Images/GIFs in `06_VISUAL_PREVIEWS` are wireframe-style original concept samples, not final art assets.

## Verified external sources (accessed 2026-10-31)

- [Devpost official rules](https://twitchcon-codex.devpost.com/rules): submission cutoff **2026-11-02 14:00 PST = 2026-11-03 06:00 WITA**, new project during submission window, Twitch interactive connection, built with Codex, repo + demonstration video + description + Codex session ID; English submission or translation required.
- [Devpost organizer final weekend note](https://twitchcon-codex.devpost.com/updates/47341-final-weekend-make-your-project-come-alive): real Twitch footage, max 3-minute YouTube demo, start upload early, do not modify submission files after deadline.
- [Twitch EventSub subscriptions](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types): `channel.chat.message` v1.
- [Twitch Example Chatbot](https://dev.twitch.tv/docs/chat/chatbot-guide/): Example EventSub WebSocket + Helix Send Chat Message.
- [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth): authorization-code grant flow for server applications.
- [Twitch EventSub WebSocket handling](https://dev.twitch.tv/docs/eventsub/handling-websocket-events): session welcome/keepalive/reconnect.

## Fundamental caveats

- Cluenite name availability has **not** been certified through trademark counsel or live domain registry checks.
- User interface previews are illustrative and not a built game.
- Time budgets are **design hypotheses**; not claims about actual Twitch user behavior.
- Case truth, interaction and fairness must be playtested with real humans; no concept can guarantee fun.
- Do not commit secrets, tokens, private user data, or copyrighted media to the hackathon repository.
