# Capture sheet for the 2:55 Cluenite film

**Prepared:** 2 November 2026. **Status:** prepared; no new Twitch messages sent by the video revision.

The owner-controlled accounts previously used for integration are `layordna` and `androcadangan`. Revalidate the identity, consent, current channel/session routing and broadcaster permissions before capture. Use new isolated demo sessions; never stop, reset or overwrite an existing session to make the take work. Halt if a target would affect an unrelated participant or broadcast.

## Exact action list

These are **19 real test messages maximum**, only after explicit owner permission. Do not run this list as an unguarded shell loop. Wait for each command's actual application response and correlate its provider receipt before moving on. Do not post tokens, URLs, test reports, or non-game text to Twitch.

| Case | Destination | Messages, in order |
| --- | --- | --- |
| Q01 — S1–S3/S8 | New consenting owner-controlled single-channel demo | `!look CAM`; `!look SCHEDULE`; `!link CAM_R07 SCHEDULE_R07`; `!solve ROBOT` |
| M01 — S4–S5 | New consenting owner-controlled single-channel demo | `!look PHOTO`; `!look CASE`; `!look ACCESS`; `!look TROLLEY`; `!look WORK_ORDER`; `!order BLACKOUT HEAT ORDER OPEN TROLLEY`; `!order HEAT ORDER OPEN TROLLEY BLACKOUT`; `!theory BLACKOUT_THEFT`; `!challenge BLACKOUT_THEFT ACCESS_RECORD`; `!solve SAFE_MOVE` |
| C01 — S6 | New accepted co-op, field channel A | `!scan P4`; `!share SCAN_P4` |
| C01 — S6 | The same co-op, records channel B | `!verify B17`; `!share MANUAL_B17_212` |
| C01 — S6 | The same co-op, field channel A | `!solve B17` |

The engine sequences are verified in [round.test.ts](../../tests/engine/round.test.ts); live provider/UI acceptance must still be observed. Rehearse all commands locally before spending a real-channel take. Current authenticated APIs and UI, not state injection or mocked network responses, must create and run the demo sessions. A new invitation requires the actual consenting partner; do not fake consent.

## Picture and privacy

Record app content and the consenting test chat at 1920×1080. Crop browser chrome, private session URLs, overlay credentials and unrelated messages. OBS must be a local recording or source capture; do not start a broadcast, virtual camera, or change the user's ordinary scene collection. Capture each accepted response with at least a two-second reading hold and keep raw clips plus a sanitized timestamp/command/proof manifest.

S7 uses actual repository source, the fresh local engine-test result and genuine build records. It must not show an invented Codex conversation, placeholder session ID, replayed terminal success represented as live, or credentials. The session ID belongs in the submission field once supplied from the actual principal build thread.

## Fallbacks

If new real-provider capture is not authorized, keep the full 2:55 script and mark the missing shots as pending. Existing OBS stills may be used only with a dated-still label. Public M01 previews and manuscript practice clips remain explicitly labeled previews/samples; they cannot satisfy a real Twitch action slot. S6 may use the original responsive fallback with its separate narration. A film with missing required footage must not be described as submission-ready.
