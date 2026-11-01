# 03 — Twitch Interaction Design & Social Collaboration

## Design doctrine

**Actions matter; people matter; popularity doesn't determine truth.** Commands are simple so even a mobile user can join without opening links. Most actions are typed in Twitch chat, mirrored by the streamer dashboard; the overlay should never flood a viewer with raw command logs.

## Command surface (case-local IDs, easy aliases)

| Twitch chat input | Effect | Cooldown recommendation |
|---|---|---|
| `!look A` | Inspect A (alias of `!inspect A`) | 2s per user |
| `!link A B` | Try authored evidence relation | 2s |
| `!order B A C` | Submit sequence for current timeline node | 3s |
| `!code 241` | Solve current code/pattern | 3s |
| `!challenge T1 E3` | Refute theory with known evidence | 3s |
| `!theory T2` | Propose a theory, no truth vote | 4s |
| `!help` | One concise description (avoid reply flood) | 15s |
| `!hint` | Request existing hint; aggregated per current stage | 15s |
| `!solve ROBOT` | Answer current quick-case verdict | 3s |
| `!scan P4` | Use Field workstation observation tool (co-op) | 3s |
| `!verify B17` | Use Records workstation reference tool (co-op) | 3s |
| `!share FLASH_212` | Publish an already verified local fact to shared board (co-op) | 3s |

Alias rules: object IDs such as `CAM` may resolve to exactly one currently discovered evidence ID (e.g. `CAM_R07`) for easy `!link CAM ROUTE`; ambiguous objects require full evidence ID. Normalized casing, ASCII ID parser, input length ≤120 chars, maximum 5 tokens; allow localized labels on UI but stable ASCII command keys in chat. No NLP required or assumed. Server ignores unrelated normal conversations.

## Social interaction choreography

| Moment | Host action | Chat can do | UI response | Social value |
|---|---|---|---|---|
| First glance | React/read objective | Observations, short inspect | One object highlights | Discovery curiosity |
| Divergence | Ask "which theory?" | Submit distinct theory IDs | 2–3 theory tiles | Conversation, humor |
| Test | Select proposed test | `challenge/link` | Documentary proof animation | Viewer has agency |
| Surprise | React to contradiction | Correct, counter-propose | Redline old theory, new clue opens | Authentic surprise |
| Joint payoff | Confirm final verdict | Cheer / suggest if allowed | Evidence chain recap | Group accomplishment |

## Viewer 1, 20, 1,000

- **1 viewer:** all puzzle paths complete without quorum; one chat user can submit multiple *different types* of action across the round; no requirement for votes.
- **20 viewers:** first valid new actions gain small credit; merge duplicate suggestions; dashboard shows distinct hypotheses not 20 competing cards.
- **1,000 viewers:** process all commands with bounded queue, per-user rate limits, duplicate event guard, per-action aggregate; UI shows **"7 viewers spotted this clue"** only when backed by real event counts. Do not display one thousand usernames scrolling by.
- **Stream delay:** no pure first-typist winner as core gameplay, no twitch-chat 5-second deadlines; deadlines measured server-side and allow host-defined grace.
- **Audience imbalance:** each channel has separate contribution summary; shared result accepts one verified input from each workstation, not proportional votes.

## Distinct interaction modes

1. **Discovery**: valid inspector reveals an authored observation. Server credits first valid discovery and nearby collaborators if configured.
2. **Connection**: linking two independent observations advances a node; not a poll.
3. **Constructive disagreement**: streamer or viewer proposes theory; another can challenge with evidence. "Wrong" is not shameful; show why the argument fails.
4. **Navigation**: when multiple valid paths exist, a non-binding preference poll or streamer choice selects next location. Navigation is allowed to be popular; truth is not.
5. **Co-op station work**: Channel A observes scene; Channel B verifies records. Either channel can contribute on its own while joint proof awaits both.
6. **Moment attribution**: evidence cards may show one or a small group of discoverers, not a leaderboard that drives toxic spam.

## Chat engagement without causing spam

- Prefer overlay for feedback. If enabled, bot posts at most one event summary per milestone or configurable interval (e.g. 30 seconds), respecting Twitch rate limits.
- Never echo every failed attempt to chat.
- Allow streamers to silence bot responses separately from overlay.
- Filter usernames and free text before rendering; avoid showing unmoderated chat messages on OBS automatically.
- Host can remove inappropriate attribution from presentation without erasing game-state facts; audit log stays private.

## Meaningful streamer identity

Hosts are presenters/decision makers, not just hands clicking buttons. Give them actions that fit live entertainment: inspect a focus object, pin a theory, request targeted test, choose next scene, challenge their own assumption, reveal reconstruction. None can rewrite the truth.

## Co-op social contract

- Consent: host B receives invite, signs in, explicitly accepts; both names and channel IDs visible.
- Role: A = field/camera, B = archive/logs; rotate roles per chapter or next case.
- No forced raid or host takeover. Shared Chat optional; direct co-op works with each room independently subscribed to chat.
- Public streams may leak clues; asymmetry comes from task/control and staggered investigation, not pretending perfect secrecy.
- Coordination: both studios share a breakthrough ledger; UI states `A ready / B investigating` but don't block all activity.
- Session is pausable, resumable, and can degrade to one-host solo mode *only* with explicit host consent and an alternate solvable path.

## Notifications and accessibility

Use visuals and text, not sound alone. Large stage objectives. Contrast for 1080p stream scaled to mobile. Avoid relying solely on red/green. Reduced motion and subtitles for any sound cues. For users unable to type, watching remains a valid experience; accessible dashboard controls work for authenticated host.
