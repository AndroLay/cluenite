# UI/UX — Every Screen, Objective, Actions, Layout and State

The SVG+PNG images in `06_VISUAL_PREVIEWS/` illustrate geometry and palette, **not** final polished illustrations. Use this as the authoritative layout intent.

## Navigation map

```
Landing → Connect Twitch → Creator Dashboard
 Dashboard ├── Quick setup → Quick Live Controls → Quick Recap
           ├── Case Library → Mystery Room → Evidence Board → Verdict → Recap
           ├── Co-op Lobby → Waiting for B → Station A/B → Shared Proof → Joint Recap
           └── Overlay Setup / Stream-safe Settings
 OBS sources (read-only) ← authenticated game state ← all live modes
```

## 01 Landing (`/`)

**Goal:** streamer understands the pitch in 8 seconds. Hero: "Solve tiny mysteries with chat. Build bigger ones together." CTA Connect Twitch; 2 static illustrated screenshots (Quick/Case); small explainer of no viewer sign-up; demo teaser, privacy link. No onboarding carousel.

## 02 Twitch Connect (`/auth/twitch`)

**Goal:** explain exactly which Twitch data/permissions used. OAuth redirect via backend, visible success/failure, connect bot separately if necessary. No passwords/secret copied into frontend. Display recognized channel name, connected status, scopes and reconnect action.

## 03 Creator Dashboard (`/app`)

**Primary zones:** 1) connection & overlay status header, 2) Quick Case big Start card, 3) Mystery Live case picker, 4) Co-op invitation, 5) status/recent session. "Copy OBS URL" unobtrusive but obvious. Display whether EventSub active. Never show full overlay secret token in screenshots.

## 04 Quick Controls (`/app/quick`)

**Layout:** 40% case preview, 30% connected chat signals, 30% control rail. Large Start/Pause/Skip/Hide; overlay preview; rounds selector; timing mode; live command hints; connection warnings. Good default is minimum clicks.

## 05 Compact OBS (`/overlay/quick/:opaque_token`)

**Base concept:** 600×340; dark panel, header/timer, hero illustration, 1-line objective, one command, 0–3 small evidence chips, progress indicator. No inputs in OBS itself. Streamer can resize/position source in OBS. Display only safe public clue state; overlay must never include Twitch OAuth tokens or unrevealed answers.

## 06 Case Library (`/app/cases`)

**Layout:** cards by duration/complexity/solo-coop. Each card has preview, one-line premise, estimated playing time, content rating, 3 mechanic chips; `Start Case`, `Preview`. Default curated first case. Missing asset cases hidden until verified.

## 07 Mystery Room (`/app/session/:id`)

**Primary panel:** illustrated scene ~60% of width with large selectable IDs; evidence panel ~25%; contextual objectives, chat events and host controls rest. Zoom focus on clue without changing whole page. Thread-safe overlay projection derived from same state revision.

## 08 Evidence Board (`/app/session/:id/evidence`)

**Layout:** verified evidence cards with labeled link lines, current theory hypotheses in separate column, ruled-out theories beneath. Limit 6 open cards per viewport, use cluster navigation and time order rather than infinite string-wall. Context actions link, challenge, pin.

## 09 Timeline Puzzle (`/app/session/:id/timeline`)

**Layout:** 3–5 large chronological event cards, draggable dashboard for host with keyboard fallback, viewers submit `!order <IDs>`. Avoid simultaneous conflicting drags: host view is authoritative, viewer commands are proposals validated and applied.

## 10 Theory Panel (`/app/session/:id/theories`)

**Layout:** 2–3 hypothesis tiles each labeled `UNPROVEN`, `SUPPORTED`, or `REFUTED`. Link evidence to refute. Clicking Theory does not magically make it true. No public "this viewer is stupid" text.

## 11 Verdict / Reconstruction (`/app/session/:id/verdict`)

**Layout:** select conclusion, show slots "Required proof types" with checked verified facts, lock Submit if insufficient. When solved, 4 chronological reveal cards with compact timeline and contributors. Option Save/End.

## 12 Co-op Lobby (`/app/coop`)

**Layout:** host A invite with explicit B account, pending status, B accept/decline, 2 channel health indicators, role descriptions and case duration. Do not auto-start while awaiting consent.

## 13 Co-op Stations (`/app/coop/:id/station`)

**A:** environment/visual observation plate and field instruments.  
**B:** logs, manual, archive/records and reference verification.  
**Both:** compact shared proof rail and counterpart status. Pairing gate visually shows "need A observation" / "need B reference" while allowing independent tasks.

## 14 Co-op Shared Board (`/app/coop/:id/shared`)

**Layout:** two lanes A teal / B lilac converging into one large gold/teal verified breakthrough card. Show matched evidence IDs and reasons, not simply "both ready".

## 15 Recap (`/app/recap/:id`)

**Layout:** clear case truth and evidence chain, unresolved optional clues, verified contributor credit summaries, duration, distinct clues, `Play Another` and copy spoiler-aware summary. No public user handles without valid display/privacy settings.

## 16 Settings (`/app/settings`)

Twitch authorization, bot chat feedback on/off, command prefix, overlay sizing, anchor, reduced motion, safe username presentation, chat moderation, timer mode, invite permission, overlay token rotate/revoke, "test demo mode" clearly labeled.

## Empty/loading/error states

- Disconnected Twitch: Show yellow "Reconnect Twitch"; disable real-chat game start; local demo mode clearly named.
- B disconnected: keep local station work enabled, joint action paused and resumable.
- No viewers: host can inspect/solve, prompt can remain visible.
- No case asset: select another case, don't show empty broken image.
- Loading: skeleton of the scene, never blank overlay with no user feedback.
- Invalid case: neutral warning, store incident code, preserve progress and allow safe stop.

## Responsive/safe broadcast layout

- dashboard uses large desktop layout but scales to 1024-wide screens.
- OBS stage 1920x1080, quick widget 600x340; all important text is within 90%-width safe zone.
- overlay should not show real-time private user tokens/invite link, debug IDs, direct profanity, full unmoderated messages.
- Focus states, color contrast, keyboard and screen reader support for dashboard.
