# 12 — Hackathon Demo, Devpost Submission and Judge-Oriented Evidence

## Official requirements (recheck before final submit)

Source: https://twitchcon-codex.devpost.com/rules (viewed 31 Oct 2026).

- Submission window: **Oct 23 2026 10:00 Pacific – Nov 2 2026 14:00 PST**, equivalent deadline **Nov 3 2026 06:00 WITA**. Work submitted must be newly built during the eligibility window (libraries/templates are allowed as specified).
- Build for streamer/community on Twitch using **OpenAI Codex**, functioning as depicted and actually connected to Twitch through chat, overlay, Twitch API, EventSub or an Extension.
- Supply source repo URL on GitHub, GitLab or Bitbucket with **all source/assets/instructions needed to run/test**. Private repo constraints: see official rules; easiest judge access is public repo without secrets.
- Text description of features **and how Codex was used**.
- Actual **Codex session ID for the thread used to build** (never fabricate).
- **YouTube demo under 3 minutes**, publicly visible as required by rules, showing the application **functioning on Twitch** and how built with Codex; do not include unauthorized third-party copyrighted music/media or trademarks.
- Submission material in English or provide English translation of video, description and testing instructions.
- Make project available free of charge and unrestricted to judges through judging period. Verify status **Submitted**, not Draft.

Judging Stage 2 (equal weight): Innovation/Idea; Potential Impact; Technological Implementation including Codex; Design/easy to use and fun to watch.

## Submission thesis

**Cluenite turns Twitch downtime into an evidence-driven community mystery. Viewers don't just vote—they actually discover and verify clues; a single stream can host quick micro-cases or a bigger detective investigation.** If and only if proven by live two-channel tests, add: 'Two streamers can solve a case by combining independent evidence from their communities.'

## Primary demo storyboard (2:30 target; actual footage only)

| Time | Evidence on screen | Narration emphasis |
|---|---|---|
| 00:00–00:12 | Real Twitch channel with compact Cluenite overlay alongside streamer game/app | 'Turn downtime into a shared mystery' |
| 00:12–00:30 | Actual authenticated chat message `!look CAM` → evidence appears, with Twitch channel visible | 'No separate viewer login; one action matters' |
| 00:30–00:48 | Valid second clue and evidence link → confirmed relationship, then concise reveal | 'Proof, not popularity voting' |
| 00:48–01:13 | Expand into short M01 stage and evidence timeline; stream remains watchable | 'Same engine supports deeper investigations' |
| 01:13–01:37 | A theory contradicted by earlier timestamp; final reconstruction with facts | 'Wrong assumptions lead to interesting discoveries' |
| 01:37–02:02 | IF LIVE VERIFIED: two real channel workstations each contribute distinct proof and one Cross-Community Breakthrough. IF NOT: show real pause/resume/OBS refresh and explain co-op is planned | 'One engine, flexible live use' |
| 02:02–02:20 | Real Codex session/worklog, genuine unit tests and short code view | 'Built with OpenAI Codex' |
| 02:20–02:30 | Final case result/credits, Cluenite wordmark, product pitch | 'Every Clue Brings Us Together' |

Do not create fake viewer messages, synthetic second stream footage, imagined performance statistics, or video made exclusively from slideshow mockups. A developer-only simulation may be shown **only explicitly labeled** as a prototype, not as authentic Twitch interaction.

## English description (edit to match implemented code)

> Cluenite is a Twitch-native social mystery game that transforms short gaps in a gaming stream into bite-sized investigations. Viewers participate from normal Twitch chat by inspecting objects, connecting evidence and challenging unproven theories, while a deterministic case engine verifies each discovery and displays the result in an OBS browser overlay. Creators can expand the same system into a connected mystery with evidence boards, timelines and satisfying final revelations. Built using OpenAI Codex, Twitch OAuth/EventSub, a realtime web interface and server-authoritative proof validation.

**Only append if live-tested:**

> In our cooperative mode, two authenticated broadcasters investigate different aspects of one case; each community contributes distinct verified evidence before the server unlocks a joint breakthrough.

## README judge quickstart must contain

- Product intro and exact implemented feature status (P0 shipped/P1 planned).
- Prereqs: Node.js version, pnpm, PostgreSQL; separate Twitch app registration; OBS Browser Source; command scripts.
- `.env.example` listing variable *names*, not credentials; OAuth redirect URL exactness and needed scopes; Twitch app steps.
- Local development setup, migration, build/test/start; one test-mode fixture explicitly labeled synthetic.
- Live Twitch steps: host connects, creates case, viewers type commands, OBS URL and safe source dimensions, verdict/reveal.
- Deployment/public test access while judging. If external API credentials aren't available to judges, documented preconfigured test channel workflow or safe credential setup according to rules; don't overstate judge access.
- Use of Codex: concrete tasks, session ID reference and development evidence.
- Asset licenses / source provenance; user privacy notes and limitations.

## Evidence checklist

- [ ] Reproducible repo URL and code/asset licenses.
- [ ] No secrets or hidden answer exposed by frontend bundles.
- [ ] Real Twitch chat accepted; EventSub received from actual authorized channel.
- [ ] Public HTTPS app URL works, OBS Browser Source displays game.
- [ ] Snapshot reconnect verified; host can pause/collapse.
- [ ] At least one proof requirement and failed guess visibly demonstrated.
- [ ] Video on **YouTube**, under 3 min, not private and with appropriate rights.
- [ ] Shows actual Codex workflow and exact real session ID.
- [ ] Project description aligns with tested feature set.
- [ ] English materials or full translation available.
- [ ] Devpost shows **Submitted** by deadline.
- [ ] Hosting and judge test access survive through judging period.

## Final scope reality check

Judge weighs quality of real implementation, design and novelty. If time is constrained, submit **one excellent Twitch-connected Q01 plus a meaningful 3-stage M01** with clear visuals instead of a nonfunctional 60-minute multi-channel platform. Co-op is a signature *vision* and should be claimed as available only if separately tested with two authorized channels.
