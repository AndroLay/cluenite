# Codex Kickoff Prompt — Build Cluenite From This Blueprint

Copy into Codex after placing this blueprint directory in an authorized repository. **This is an implementation prompt, unlike the earlier discovery-debate prompts.**

---

You are the lead engineering agent building **CLUENITE**, a Twitch-native cooperative puzzle / mystery game for the Codex × TwitchCon Hackathon.

Read the entire blueprint in this exact order:

1. `00_START_HERE/README.md`
2. all `01_GAMEPLAY/*` sorted by filename
3. all `02_PLAYABLE_CASES/*` sorted by filename
4. all `03_ART_AND_MOTION/*` sorted by filename, including `design_tokens.json`; inspect preview SVG/PNG/GIF in `06_VISUAL_PREVIEWS/`
5. all `04_TECHNICAL/*` sorted by filename
6. all `05_DELIVERY/*` sorted by filename, especially roadmap, checklist and risks
7. fixture files and validate them; **do not interpret sample fixtures as production-ready solutions**.

**Priority order:** gameplay → actual Twitch connection → readable OBS reveal → case proof → host controls → polish → co-op only if stable. Inspect repository and preserve existing stack if it works; otherwise recommended Fastify + Vue TS monorepo.

First output: a brief gap analysis of existing repo, available credentials, current gameplay state, and highest-risk blocker. Then implement **P0** incrementally: single Twitch OAuth, `channel.chat.message` EventSub, normalized command parser and durable dedupe, validated Q01 state engine, DB persistence, broadcast to read-only OBS overlay, minimal dashboard, multi-step M01, proof-based result/reveal, retry/reconnect, tests and setup docs.

**Never** invent real Twitch viewer events, co-host availability, test results, app permissions or a Codex session ID. A local simulated adapter must be clearly labeled TEST, separated from true live demonstration. Do not store OAuth tokens client-side or in Git. Do not include unrevealed case answer/proof solution in public OBS payloads. Do not treat a user's guess as correct before proof.

For every completed feature: run actual tests, report command/output, capture relevant screen of real app if possible, mark only implemented/verified checklist items. If missing credentials block live Twitch test, still implement offline adapter but explicitly report integration unverified. Do not claim production-ready based solely on passing mocked tests.

When constraints force cuts, prioritize one truly functioning Quick Case rather than many incomplete pages. Record all actual Codex work as evidence for hackathon submission. At end, produce working README, `.env.example`, seed fixtures, setup guide, concise test report, short honest English submission copy and demo shot list.

Do not modify existing gameplay-debate history; it remains historical design input. The **present blueprint overrides old proposals where they conflict**, but always validate updated specifications with the human owner.

---
