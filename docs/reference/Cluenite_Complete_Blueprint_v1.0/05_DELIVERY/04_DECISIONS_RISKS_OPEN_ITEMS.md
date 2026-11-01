# Decision Register, Risks and Explicit Unknowns

## Decided for v1 blueprint

- Name: **Cluenite** tentative; domain/trademark check pending.
- Gameplay signature: **proof-based social detective play** with Observe–Connect–Challenge–Reveal.
- Modes: Quick Case and Mystery Live share engine; co-op is dual-workstation long session.
- No gore, no heavy animation, no AI judge that invents truth.
- Evidence links and causal proof validated by server and authored case rules.
- Audience influence measured through actual accepted actions, not mere majority voting.
- Viewers use Twitch chat, streamer dashboard and OBS overlay.
- Co-op requires explicit second streamer consent; no automatic raid handoff.
- Accessible, low-stress design with hints, untimed option and interruption-safe save.

## Unresolved high-priority questions

| Question | Why | Proposed resolution |
|---|---|---|
| Is there an existing repository? | Reusing stack saves delivery time | inspect before implementation |
| Are Twitch credentials and two channel accounts available? | co-op cannot be claimed without them | test one channel first; co-op P1 |
| Does Q01 feel fun after three repeats? | one puzzle format may bore | cold + replay playtest |
| Can multiple users understand command IDs quickly? | chat onboarding friction | alternate `!look 1` aliases, overlay cheat sheet |
| Is Cluenite legally/registrably clear? | naming conflicts | trademark/domain check before launch |
| Are visual samples sufficient? | current previews are wireframes, not full illustration kit | produce authored or licensed original art assets |
| Real OBS performance? | capture tool differs from browser | test actual OBS with live stream video |
| Co-op content spoiler leak? | public streams reveal facts | tasks/control asymmetry, not pretend secrecy |
| Can both streamer co-op actions truly be independent? | host B must not be idle | instrument-specific proof actions and playtest |

## Known tradeoffs

1. Long mode is more distinctive but harder to complete in short hackathon window. **Only expand after live quick loop works.**
2. Streamer-as-reader OAuth is simpler than operating a dedicated bot, but may need host permissions and current EventSub scopes verification in real channels.
3. Author-written cases reduce AI novelty but improve logical consistency and fun; Codex remains core to build, instrumentation, testing and content tools.
4. Authored proof ensures correct resolution but requires careful case design and reduces freeform expressive answers; chat conversation itself remains freeform socially.
5. A visual storyboard is not final artwork, and a GIF is not runtime motion code; don't present these previews as feature completion.

## Validation milestones

- [ ] Case fixture compile/static graph validation passes.
- [ ] Local interaction trace passes.
- [ ] Real Twitch chat event changes server state.
- [ ] OBS browser source displays same state.
- [ ] Correct answer without evidence cannot end case.
- [ ] One human playtest produces meaningful viewer action and an independent request for another round.
- [ ] Multi-stream A/B live proof demonstrated **or** co-op clearly marked not yet implemented.
- [ ] Formal name check for public release.
- [ ] English video/submission/repo docs ready.
