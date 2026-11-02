# Frontend/backend integration

Updated 3 November 2026 WITA. The latest compatibility pass preserves the immersive frontend and local practice experiences. No deployment, dependency, migration, or backend API change is part of this frontend pass.

## Latest immersive integration

- `LiveCaseExperience.vue` is the mounted Q01/M01/C01 live presentation. `view=dashboard` opens its host panel immediately; ordinary session links open the scene. Finished rounds do not offer Restart.
- Team A owns browser gameplay and lifecycle commands. Team B receives read-only station/evidence interactions plus **Session tools**, including its authorized team-scoped OBS credentials. Viewer station commands still arrive through Twitch.
- Confirmed restart acknowledgements, including a retry after a lost acknowledgement, clear local timeline, selection, theory and dialog drafts. Pause/resume preserves drafts. Remote snapshots clear drafts when accepted progress or elapsed time regresses. A remote restart of an untouched round has no distinct generation marker in the existing contract; the client does not guess from an idle timer alone.
- Declined OAuth attempts describe that attempt while showing the browser's actual existing connection. Explicit sign-out clears invitation continuation before the request, including when the response is lost.
- Catalog previews send no commands and do not display a live station-chat callout. `/coop/field`, `/coop/records`, and `/coop/shared` remain samples; authenticated stations use `/?session=<id>`.
- The live phone header places identity and connection/timer metadata on separate rows, keeping long Twitch status text from squeezing the case title.

Current checks and version boundaries are recorded in the [integration evidence](../evidence/frontend-integration-2026-11-02.md#latest-compatibility-pass---3-november-2026-wita).

## Working user flow

1. Open `/dashboard` or `/play`. `GET /api/me` confirms this browser's identity; `GET /api/sessions?status=open&limit=20` finds saved sessions. Continue an existing session before creating another. The backend allows one open hosted case per broadcaster.
2. Create Q01 or M01 from `/play`. The confirmed session opens at `/?session=<id>&view=dashboard` in `READY`, with the host panel open; Start, Pause, Resume, Restart and Stop use the existing authoritative Socket.IO controls. Partner accounts do not receive owner command forms or lifecycle buttons.
3. Open `/setup`, choose an accessible session, and explicitly create/copy its OBS link. `/setup?round=<id>` preselects a session only after it appears in the authorized session list. The query name is deliberately `round`: `session` selects the live application in the existing router.
4. Open `/coop`, select/create the C01 lobby, enter a Twitch username, and copy the invitation. Creation sends no message to the partner. Share it privately yourself. The host starts after the named partner accepts.
5. An invitation removes its bearer from the visible address. A validated continuation survives a reload and OAuth in the same tab for at most 20 minutes. `/connect` offers **Continue co-op invitation** after sign-in. Consent remains explicit. Acceptance opens the actual Team B session; decline closes the invitation.
6. C01 renders the authenticated Field/Records workstation and Shared breakthrough from server snapshots. A URL never chooses the team. Revoked partner membership appears in Saved sessions with an explicit Rejoin action after reauthorization.

## Reusable integration surfaces

| Source | Responsibility |
| --- | --- |
| `apps/web/src/net/api.ts` | Bounded same-origin JSON requests, CSRF headers, safe error messages, no automatic mutation retries. |
| `apps/web/src/site/account.ts` | Coalesced account checks shared by page and shell. A callback query alone never proves sign-in. |
| `apps/web/src/site/SessionList.vue` | Bounded session discovery, explicit selection/continuation/rejoin; no polling or automatic rejoin. |
| `apps/web/src/components/OverlayControls.vue` | The same explicit create/copy/replace/revoke behavior in Setup and the live host panel. |
| `apps/web/src/site/LiveCoopLobby.vue` | Session creation/selection, username resolution, private invitation copying and replacement. |
| `apps/web/src/site/inviteContinuation.ts` | Strict UUID/bearer shape validation and expiring same-tab storage. |
| `apps/web/src/components/LiveCaseExperience.vue` | Mounted immersive Q01/M01/C01 scene, evidence, timeline, theory, hints and server reveal, using the authenticated projection. `CoopLiveBoard.vue` is retained but is not mounted by the current router. |
| `apps/web/src/net/roundClient.ts` | One socket per live page, validated snapshots, bounded/coalesced recovery reads and safe mutation retries. |

Keep these contracts when changing the layout. Avoid copying their request logic into a second presentation component.

## Important boundaries

- Live authored cases remain Q01, M01 and C01. The manuscript, express and lighthouse practice experiences are local scripted games with separate content/rules; their progress is not a persisted live round or a Twitch event. The existing `/coop/field`, `/coop/records` and `/coop/shared` routes without a session are labeled previews.
- C01 station proof and sharing require viewer chat: Team A uses `!scan P4`, Team B uses `!verify B17`, and each shares its discovered record with `!share <record-id>`. Host buttons inspect, request hints and propose verdicts; they do not impersonate viewer contributions.
- Shared breakthrough includes evidence marked `shared` **and** visible global evidence whose `team` is null. The joint proof is not necessarily marked `shared`. Never import hidden case answers or fabricate the other team's private findings.
- Retain the same idempotency key after a lost mutation response. The live page keeps **Retry last action** available even if an authoritative snapshot changed the phase or removed the original action button.
- Overlay and invitation secrets are returned only at creation. An exact-key replay cannot recover a lost link. Require an explicit replacement; a new overlay credential replaces the previous credential for that session/team.
- Overlay HTTP recovery uses `credentials: "omit"` with the scoped bearer. Sending an unrelated signed-in cookie would let HTTP choose a different team than Socket.IO.
- Overlay/invitation URLs are not rendered, logged, or stored in persistent browser storage. Only pending invitation consent uses expiring `sessionStorage`; acceptance, decline, terminal failure and browser sign-out clear it. Disabled storage is handled without throwing; the original link remains the fallback.
- No continuous account/session polling was added. Revision-gap reads are single-flight, coalesced, spaced by at least two seconds and bounded after repeated failures; normal socket updates require no extra HTTP read.

## Verification boundary

Focused regression tests cover invitation expiry/storage failure, retry-key preservation, explicit retry after a changed phase, confirmed restart callbacks, scoped overlay reads, coalesced/later revision gaps, denied membership and stale reconnect timers. Run:

```powershell
npm test -- apps/web/tests/roundClient.test.ts apps/web/tests/inviteContinuation.test.ts
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
```

Browser integration uses an owned headless Chrome profile, the built frontend, actual Fastify/Socket.IO endpoints, and a fresh local PostgreSQL test schema. Provider identities, OAuth completion and viewer inputs are synthetic; they do not certify a new real Twitch authorization, production EventSub delivery or a deployed service. The fixture cannot modify the application's existing game sessions and removes its own schema afterwards. Current dated results are recorded in [STATUS](../STATUS.md) and [frontend progress](FRONTEND_PROGRESS.md).

Visual polish, broader assistive-technology acceptance, new practice-case backend authoring and remote deployment remain separate from this integration pass.
