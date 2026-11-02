# Cluenite: the brass lens

**Rejected by the owner, 2 November 2026.** The duration must remain 2:55, the original script and Codex build content must be restored, and the decorative 3D opening must be removed. See [the current 175-second brief](SUBMISSION_175S.md). This document is retained as iteration history, not current direction.

Date: 2 November 2026. Current composition: `ClueniteCommercial`, 90 seconds, 1920×1080, 30 fps. This supersedes the 126-second `ClueniteFilm` direction; that source and the original Haiku draft remain available.

The owner approved the optical study's direction, then required the added elements, contrast, materials, lighting, and typography to match Cluenite. Fun remains the priority. The film follows one actual local sample case rather than listing features.

## Visual and motion system

Use the active Cinematic Brown Noir system in `apps/web/DESIGN.md` and `src/style.css`: obsidian `#100d0a`, espresso `#211811`, walnut `#493021`, leather `#65432d`, antique brass `#a77a48`, warm gold `#d9b681`, parchment `#e9decb`, dim parchment `#bfb19a`, brass thread `#c79a62`, and restrained burgundy `#64352f`. Large headings use the same bundled EB Garamond; labels use Inter. The local OFL licenses are included.

The authored Three.js magnifier has aged-brass rings, a walnut/leather handle, warm localized key light, dark brown fill, and a restrained amber rim. Its lens samples actual application pixels. It is an editorial camera guide, not a claim that the game ships a magnifying-glass overlay. The opening and closing share this object. No low-resolution landing JPEG is enlarged for the final film.

Captured gameplay keeps its original pixels and palette. Push into a real control or record when its text matters; establish the surrounding UI before an editorial enlargement. The source crop uses explicit source coordinates and `object-fit:fill` to override Remotion's default contain letterbox. Shot containers preserve the intended crop proportions. High-density native records support settled proof holds.

## Shot score

| Time | Entry, action, reading hold, exit |
| --- | --- |
| 0–14 | The brass lens enters from below, notices the clock, then moves to the real window. The desktop comes into view; an actual find releases the native dry-sill record. The lens enlarges that record. |
| 14–21 | Cut into actual room finds, with a separate readable crop of the app's scripted sample crew. This is an energetic montage, not a claim that every chat line can be read. |
| 21–29 | Offer the gardener theory, test the weak mud record, and show why the dry window disproves it. Hold the actual result. |
| 29–39 | Native key and clock records enter as paper objects, joined by a brass thread. Return to their actual Board context, show the link, and hold the real deduction. |
| 39–49 | Show selected actual timeline moves and the accepted order, with a separate editorial comparison of 20:52 and 21:05. Hold the checked state. |
| 49–55 | Challenge Ada's actual locked-study claim with the key register. The real contradiction appears beside her room silhouette. |
| 55–60 | Show the actual rejected Tomas accusation and the available suspects. |
| 60–77 | Retain the actual Ada choice, play the native reconstruction, then hold the actual coat-lining twist for four seconds. Native text is enlarged from the captured UI. |
| 77–84 | Show the current case menu and a separately labeled Mystery Live visual preview. |
| 84–90 | Resolve to Cluenite and “Your chat. On the case.” The original brass lens returns; the authored music resolves. |

## Capture and provenance

The film uses a frozen local build of the existing web app at `http://127.0.0.1:5185`, built into `.cache/demo-web-snapshot-20261102`. That keeps footage consistent while unrelated frontend work continues. No app source was changed for the video.

- Current continuous source: `apps/demo-video/out/production-capture-2026-11-02T13-58-18-562Z/`; 17 completed takes, zero captured page errors.
- Edited actual recordings: `apps/demo-video/public/commercial/`; `clip-manifest.json` records source starts, durations, and retiming. `editorial-manifest.json` records additional cuts and held source frames.
- High-density actual records: `public/motion-ui/`; `manifest.json` gives viewport, native element rectangles, and raw evidence directory. `window-find-source.json` separately identifies the retained opening interaction recording.
- Capture uses normal public sample controls. Assist is used for objects clipped by the native room camera and for the separate high-density proof pass. No state injection, mocked network, authentication, Twitch messages, external mutations, uploads, or deployments are involved.
- The persistent local-sample/scripted-viewers label follows crops. The Mystery Live insert is a visual preview. This film does not establish a live Twitch/OBS round, server-validated public sample rules, or co-op acceptance.

The score is original deterministic instrumental synthesis, arranged for these exact cuts in `scripts/compose-commercial-score.py`. There is no synthetic narration, third-party music sample, or borrowed reference soundtrack. Source WAV, normalized 48 kHz stereo WAV, and generation measurements remain local.

## Reference transfer and review limits

The supplied [Momo reference](https://www.youtube.com/watch?v=NKIz-Rp-DtA) was accessed as actual local footage. Examined frame sequences cover 0–3s, 3–7s, 27–31s, and 75–79s, plus overview frames. The transferable decisions are motivated object movement, product-to-detail continuity, evolving composition, and a short energy montage. Its phone, mascot, brand identity, footage, and music are not used.

Reference coverage is frame sequences and still inspection, not verified complete normal-speed playback or audio listening. The final export's technical audit and observed review coverage are recorded separately in `DELIVERY_REVIEW.md`; a successful encoder is not an artistic certification.

## Local reproduction

From `apps/demo-video`, use the already installed local dependencies and Playwright Chromium:

```powershell
npm run typecheck
npm run commercial:score
npm run commercial:stills
npm run commercial:render
```

The final export target is `out/Cluenite-Demo-90s-v1.mp4`: H.264, yuv420p, BT.709, 1080p30, stereo AAC at 48 kHz. The local render is bounded to two workers. `commercial-delivery-spec.json` defines the 90-second delivery contract. Source, previous versions, and raw captures are preserved.
