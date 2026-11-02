# Simple setup and flexible controls

**Owner:** Codex / backend; current frontend design ownership is Opus (previously Haiku).

**Frontend reconciliation:** the local working tree now connects session selection, invitation continuation, OBS controls and explicit rejoin. See the [integration handoff](FRONTEND_BACKEND_INTEGRATION.md) and [dated evidence](../evidence/frontend-integration-2026-11-02.md). The backend-only checks below retain their original scope; visual/player acceptance and production deployment remain separate.

**Verified:** 2 November 2026, 11:31 UTC, local API and real Twitch accounts.

**Scope:** additive backend contracts and a frontend handoff, not completed interface acceptance or deployment.

## Default experience to implement

1. **Connect Twitch.** Confirm the cookie-authenticated identity with `GET /api/me`; an OAuth result query alone is not proof of login.
2. **Continue or choose a case.** Load `GET /api/sessions` before offering session creation. Restore the last selected session only if it is in the authorized list. If several sessions are available, show a compact chooser rather than silently choosing a different round. An empty list leads to case selection; a failed request shows Retry rather than pretending no sessions exist.
3. **Prepare OBS when needed.** Issue a credential only on an explicit user action and copy the exact returned `url`. Show the matching session/team and expiration. Do not display a placeholder as a usable URL.
4. **Start.** Show one primary action appropriate to the authoritative phase: Start for READY, Resume for PAUSED, Open session for ACTIVE, or invitation/consent progress for COOP_WAITING. Keep server rejection and connection state visible.

Keep Pause, Stop, Restart, credential replacement/revocation, co-op management, and diagnostics available in clearly named secondary controls. Stop and Restart must remain deliberate. Preserve the existing authored Q01/M01/C01 behavior and supported controls; do not invent unsupported game settings. Viewers continue using ordinary Twitch chat without a separate Cluenite login.

## Recover sessions after refresh or login

`GET /api/sessions` requires the existing host cookie. It does not need CSRF or an idempotency key. Defaults are `status=open` and `limit=20`; `limit` accepts integers 1–50. `status=all` includes bounded recent terminal sessions for active memberships; it is not a complete archive or a paginated history API.

```json
{
  "sessions": [
    {
      "sessionId": "<session UUID>",
      "caseId": "C01_HARBOR_SIGNAL",
      "title": "Signal of the Invisible Ship",
      "phase": "ACTIVE",
      "revision": 7,
      "team": "B",
      "role": "partner",
      "needsRejoin": true,
      "updatedAt": "<ISO 8601 timestamp>"
    }
  ]
}
```

Results are ordered by latest update and contain participant metadata only, without case state, answers, tokens, or another account's sessions. Open phases are COOP_WAITING, READY, ACTIVE, and PAUSED. Invalid/unknown query parameters return `400 invalid_session_query`; unauthenticated requests return 401; database failure returns `503 session_list_unavailable`.

`needsRejoin=true` exposes only a previously accepted partner's recoverable open membership. It does not grant snapshot or socket access. After renewed Twitch authorization, offer an explicit Rejoin action using `POST /api/coops/sessions/:sessionId/rejoin`, then reload the list and snapshot. Never rejoin automatically or present a partner as the owner. Existing membership and host-control authorization still apply.

## Invite a partner by username

REQ-FE-006 is implemented server-side. Send **either** `{sessionId,inviteeLogin}` **or** the compatible legacy `{sessionId,inviteeTwitchId}` to `POST /api/coops/invitations`. Both/neither/unknown fields are rejected. Username input trims surrounding whitespace, accepts one optional leading `@`, and normalizes case. The server verifies ownership before resolving the identity through Twitch; the frontend must not guess numeric IDs.

Keep the existing cookie, `Origin`, `X-CSRF-Token`, and stable `Idempotency-Key` mutation headers. A successful response is:

```json
{
  "inviteId": "<invitation UUID>",
  "expiresAt": "<ISO 8601 timestamp>",
  "token": "<opaque bearer returned once>",
  "url": "<PUBLIC_ORIGIN>/coop/invite?invite=<invitation UUID>#token=<opaque token>",
  "invitee": {
    "id": "<resolved numeric Twitch ID>",
    "login": "<canonical Twitch login>",
    "displayName": "<Twitch display name>"
  }
}
```

`invitee` is present for username requests. Use the returned `url` directly, show the resolved identity, and let the host share it; creation does not send chat, email, or another external message. Treat the entire link as a secret. Never log, render, or put its token in a query string, telemetry, or error report. The bearer is returned only at creation; it is not strictly single use. The named invitee can safely retry acceptance and receive `alreadyAccepted` while its accepted membership remains active. Existing consent, expiry, replay/conflict, and membership rules remain unchanged.

Handle `404 twitch_user_not_found` as a username correction. `503 twitch_lookup_unavailable` is a temporary lookup failure. `503 twitch_connection_recovering` includes `Retry-After: 2`: retry with backoff and the same mutation key rather than forcing OAuth. The background Twitch manager owns refresh; this route does not refresh concurrently, and lookup remains unavailable until that worker recovers. `409 twitch_reauthorization_required` means the local authorization is absent. Existing `invite_idempotency_replay` does not recover the secret link returned at creation; never silently create another invitation as a network retry.

For a signed-out invitee, Haiku should retain the pending invitation only in same-tab `sessionStorage` before starting OAuth, remove the token from the visible address, and recover it on the fixed-origin return. Clear it after acceptance, decline, logout, or expiry, and reject malformed/stale stored values. Do not use persistent `localStorage` or add a user-controlled OAuth return destination. The existing accept/decline endpoints still verify the named authenticated account. This browser wiring is implemented; see the [frontend integration handoff](FRONTEND_BACKEND_INTEGRATION.md) for the current flow and dated verification boundary.

## Keep OBS credential handling explicit

Use `POST /api/sessions/:sessionId/overlay-credential` and its exact `{url,expiresAt}` response. The bearer is returned once in the fragment. A new issuance key replaces the previous credential for that participant's projection; an exact replay returns `409 overlay_credential_already_issued`, not the lost URL. Do not generate a new key to disguise a retry. If a link was lost, offer an explicit Replace OBS link action and explain that the previous link stops working.

Credentials are scoped to a session and team view. A single permanent broadcaster OBS URL across new sessions is not implemented. Preserve the current URL when revisiting the same session if the client still holds it securely; otherwise offer explicit replacement. Never store this bearer in ordinary persistent client settings. Revoke using the existing DELETE endpoint.

## Evidence and remaining handoff

- Local suite: **125 tests in 24 files**; server typecheck/build and zero-warning changed-file lint pass. Twelve new API/PostgreSQL/provider-fixture regressions cover username lookup, compatibility, rejection paths, rediscovery, and consent-preserving rejoin discovery.
- Fourteen real runtime readback checks pass: persisted authorizations, both recovered EventSub workers, bounded session discovery, preserved primary READY M01 and current secondary gameplay, and actual normalized Twitch username lookup. No new real invitation, chat command, game control, credential rotation, or deployment was used in this pass.
- The first runtime helper incorrectly assumed the secondary had no open round. That failed report is retained; a separate readback compares the API with current saved membership metadata and preserves the existing ACTIVE Q01.
- Haiku still owns dashboard/session selection, invitation generation/continuation, actual OBS-link controls, recovery copy, and visual/accessibility acceptance. These backend checks do not certify those interfaces. Full contracts are in [BACKEND_CONTRACTS.md](BACKEND_CONTRACTS.md); dated evidence is in [BACKEND_PROGRESS.md](BACKEND_PROGRESS.md).
