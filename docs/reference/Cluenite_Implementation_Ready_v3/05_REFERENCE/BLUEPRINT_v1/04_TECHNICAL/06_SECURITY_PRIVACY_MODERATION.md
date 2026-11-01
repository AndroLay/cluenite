# Security, Privacy, Spoilers and Moderator Controls

## Trust boundaries

1. **Twitch EventSub** is external input; identify channel and sender from authenticated Twitch event, dedupe by event ID; never accept user-supplied `actorTwitchId` from public REST as truth.
2. **Host dashboard** uses secure HttpOnly/SameSite cookies, anti-CSRF state, host authorization, CSRF defense for mutations. Co-host operations require accepted membership.
3. **OBS overlay** receives only a filtered projection with read-only session token; hidden answers, broadcaster OAuth tokens, session admin controls and unrevealed staff notes never included in overlay payload.
4. **Case content** reviewed authored data, but all strings still escaped/sanitized; never execute input text or arbitrary HTML.
5. **DB** encrypted token fields, backups access controlled, separate DB credentials and least privilege.

## Auth checklist

- Twitch OAuth authorization code with random `state`, exact callback allowlist, secure server session and token validation/refresh.
- Co-op invites expire, target a single Twitch broadcaster ID, single-use; verify B is not A and is genuinely authenticated.
- Overlay token random high entropy (≥128-bit), hashed in DB, scoped to read-only channel projection, revocable and rotatable.
- CSRF prevention on state-changing host routes.
- CORS exact origins only; secure cookies; CSP for overlay and dashboard; `Referrer-Policy` restrictive so overlay tokens don't leak via outgoing requests.

## Chat abuse controls

- Parse only commands beginning with configured exact prefix; drop commands over size/token count limits.
- Cooldown by channel/user/verb; per-session rate budget; repeated invalid attempts ignored with private dashboard count, not public shame.
- Do not reflect raw unmoderated messages on OBS. Display sanitized Twitch display names or anonymized contributor label.
- Chat commands from timeout/deleted messages: best effort honor Twitch moderation signals when subscribed; do not claim impossible universal guarantees.
- Moderation UI: hide contributor username / hide all credits / silence bot responses / disable commands / pause game.
- Never use AI to auto-judge whether a real viewer is lying, guilty or deserves punishment.

## Spoilers and safety

- A viewer can type the intended solution in public chat; spoiler protection is a presentation/validation problem, not cryptographic secrecy.
- Gate verdict on collected proof; don't leak internal answer keys into client JavaScript or OBS snapshots.
- Optional spoiler display and stream delay settings; hide conclusion until evidence available, but don't censor real Twitch chat by pretending you control its entire feed.
- Cases fictional, light tone; avoid personal identification, real crimes, defamatory accusations, private photos, violent imagery.

## Privacy and retention (draft policy to finalize for deployment)

- Store Twitch IDs/name only to authenticate and attribute real contributions, not whole chat logs by default.
- Delete/redact usernames from public recap on host request; preserve nonpersonal proof events.
- Define a short retention window for session action logs, e.g. 30 days, configurable and disclosed; implement deletion before public product launch.
- OAuth refresh tokens secret-encrypted, rotate/revoke on disconnect. Do not log access tokens or copy them in support reports.
- If analytics enabled, aggregate anonymous metrics (case started/solved, completion seconds, input rejection counts); state privacy notice.

## Threat cases

| Threat | Mitigation/test |
|---|---|
| Fake second streamer using invite link | intended B's authenticated Twitch identity must match |
| Viewer POSTs fake Twitch message | public REST cannot assert Twitch chat provenance |
| Duplicate EventSub replay | durable notification/message uniqueness, no double credits |
| Overlay URL appears in clip | token rotate/revoke, scope cannot control game |
| Secret answer leaked via bundle | server-only case truth and validator |
| Free text XSS | escape/sanitize render, CSP, no HTML interpretation |
| Chat bot spam | bot disabled by default, aggregated milestone posts only |
| Server crash during solve | DB transaction replay and revision sync |
