# Frontend/backend integration — 2 November 2026

## Latest compatibility pass - 3 November 2026 WITA

**Source/environment:** latest uncommitted immersive frontend in the shared working tree. Published Render backend `8f06482` is a separate source boundary; this pass does not deploy the frontend or change the backend API. Existing design edits were preserved, including the nonblocking discovery notification introduced during verification.

**Checks:** web typecheck and an isolated Vite production build pass; 22 focused unit tests in five files pass; a complete 14-test immersive browser run passes; changed-file ESLint reports zero errors. Browser regression coverage includes requested host-panel opening, terminal controls, Team B permissions, idle pause/resume, local and remote restart, denied OAuth with an existing session, lost logout responses, Q01/M01/C01 proof, private projections, previews and the Manuscript practice flow. Repeated M01 hints are checked against successive engine snapshots. The browser run also verifies distinct Pixi environments and frozen rendering on pause or reduced motion. The later phone-header refinement passes its focused C01 browser rerun. Frontend design/tests continued changing concurrently; these are dated results, not a claim that every later edit has been checked.

The rebuilt frontend passes **15 actual API/Socket.IO/PostgreSQL browser scenarios** at `2026-11-02T18:09:13Z` using an isolated local schema and synthetic provider/viewer identities. The additional scenario issues and revokes Team B's real scoped overlay credential through the UI while confirming that its owner command form is absent. Creation retries keep one session/key; lost Start acknowledgements remain retryable; sessions survive reload; OBS links handle lost issuance safely; invitations/consent, private team projections, shared proof, rejoin and final reveal pass. Public integration pages and the live partner view fit 390 px without horizontal overflow or page script errors. The fixture closed its owned browser/server/socket resources and removed its own schema.

The frontend changed during verification. An intermediate build hid the root `html` element under reduced motion; ancestor-style diagnostics identified `html[data-motion=reduced]{display:none}` in that older compiled CSS. Rebuilding the subsequent source restored the live UI and the actual-API run above passes with reduced motion enabled. Tests now follow nonblocking discovery notifications and explicit Read details actions. The final-find handoff waits for drawer focus restoration before focusing Board, without taking focus from an open dialog or an unrelated control.

Visual inspection then found that the long pending Twitch badge squeezed the phone title/station into a tall masthead. A new assertion failed before the layout correction. The live phone header now gives identity and metadata separate rows, retaining the complete status text. The actual-API phone check confirms header height at most 150 px and no horizontal overflow; desktop layout is unchanged.

Artifacts remain in ignored `.cache`: `current-integration-green.log`, `current-frontend-unit.log`, `current-frontend-api-browser.log`, `frontend-integration-current-result.json`, and `frontend-integration-live-mobile.png`. Private invitation/OBS URLs are not recorded here. Existing real accounts, shared listeners and production sessions were not mutated by these local fixtures.

**Limits:** synthetic transport tests do not prove real production Twitch, chat, OBS Studio or player acceptance. A completely untouched remote restart has no distinct generation marker in the current snapshot contract; accepted local restart/retry and remote removal of accepted progress are covered. Manuscript, Express and Lighthouse remain local practice games. Full visual, contrast, assistive-technology and performance acceptance remains separate.

## Earlier 2 November checkpoint

**Result:** the scoped integration passes the local checks below. **Source:** uncommitted frontend integration on the local `main` working tree, based on `32ff3f4`; published backend source is `fab7f99`. Opus's concurrent frontend design changes were preserved. These results do not certify a production deployment or complete visual/player acceptance.

## Connected behavior

Saved session discovery/continuation, host Start/Pause/Resume/Restart/Stop, explicit scoped OBS create/copy/replace/revoke, C01 lobby and username invitations, consent continuation, authorized A/B workstations, shared proof and explicit partner rejoin use the current backend contracts. Local practice remains separate scripted browser content. The [integration handoff](../agent-handoff/FRONTEND_BACKEND_INTEGRATION.md) identifies the reusable components and behavioral boundaries.

## Checks and outcomes

| Check                              | Outcome                                                                         | Environment                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation/client regressions      | **8 tests pass** across `inviteContinuation.test.ts` and `roundClient.test.ts`. | Vitest in the isolated integration worktree; those sources were preserved in the main checkout.                                                                                                    |
| Web typecheck and production build | **Exit 0** for both.                                                            | Main checkout after applying the integration.                                                                                                                                                      |
| Changed-source ESLint              | **Exit 0**, zero errors with `--quiet`.                                         | The 19 integration files; this does not claim zero repository-wide warnings.                                                                                                                       |
| Isolated browser integration       | **14 scenarios pass**, completed 14:11 UTC.                                     | Owned headless Chrome, built frontend, actual Fastify/Socket.IO and an isolated local PostgreSQL schema. Provider identities/OAuth completion and viewer inputs were synthetic; no Twitch traffic. |
| Existing-account readback          | **2 accounts pass**, completed 14:15 UTC; zero API mutation attempts.           | Current local Vite frontend and API, using already-authorized accounts in an owned headless browser.                                                                                               |

The focused regression command is:

```powershell
npm test -- apps/web/tests/roundClient.test.ts apps/web/tests/inviteContinuation.test.ts
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
```

The one-shot browser/readback probes and machine reports were kept in the ignored `.cache/` directory. They were not added as a reusable test suite. The outcomes above are dated execution evidence; the isolated browser probe is not reproduced by the focused Vitest command alone.

## Fourteen isolated browser scenarios

1. A retried create request keeps one key and creates one session.
2. A lost Start acknowledgement remains retryable after a phase change.
3. Start, pause, resume and reload reflect authoritative state.
4. A saved session opens the actual host panel.
5. OBS setup copies privately and handles a lost issuance response through explicit replacement.
6. The C01 lobby resolves a username and copies an invitation.
7. Same-tab consent survives reload and a synthetic OAuth return, then opens Team B.
8. Field and Records receive separate authorized projections.
9. Overlay HTTP recovery omits an unrelated account cookie and retains its credential scope.
10. Host controls revoke the OBS credential.
11. The shared board receives joint proof after both viewer fixtures share their records.
12. Revoked partner membership requires and completes explicit rejoin.
13. A supported co-op verdict displays the actual server reveal.
14. Public integration pages at 390 px have no horizontal overflow or page script errors. The live Team B board was also checked at that width.

The fixture removed its own schema after the probe. It did not modify existing application sessions. Browser permission/clipboard behavior was controlled inside the owned test context; private URLs were not included in screenshots or this report.

## Existing authorized accounts

Both existing accounts were checked for current identity, menu/session discovery, setup selection, authorized live readback and mobile co-op rendering. Temporary local browser sessions were revoked after use. The harness blocked API writes: no gameplay commands, Twitch chat messages, invitation changes or overlay rotation were performed. These checks establish compatibility with stored real authorization; they do not establish a new real-provider OAuth flow or full real-account gameplay through every new control.

## Remaining acceptance

At this earlier checkpoint, frontend visual polish, image contrast, broader keyboard/assistive-technology acceptance and player comprehension remained open. The repeated-hint UI issue is superseded by the latest pass above. New local practice content has not been authored into the live backend cases. Fresh real-provider authorization through the current UI, production EventSub/OBS operation and deployed recovery are separate from these local results; historical real Twitch/OBS evidence is in the [backend release record](../operations/BACKEND_RELEASE_2026-11-02.md).
