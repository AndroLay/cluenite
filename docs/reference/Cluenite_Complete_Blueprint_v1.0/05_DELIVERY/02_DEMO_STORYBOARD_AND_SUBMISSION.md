# Hackathon Demo / Submission Package

## Official references

- https://twitchcon-codex.devpost.com/rules
- https://twitchcon-codex.devpost.com/updates/47341-final-weekend-make-your-project-come-alive
- https://twitchcon-codex.devpost.com/

Judge criteria equally weighted: Innovation / Potential Impact / Technological Implementation incl. Codex / Design. Project must be newly built during eligible period, truly connected to Twitch, runnable/testable, and accompanied by repo and Codex session ID. Official rules specify YouTube and ≤3-min video footage with project working on Twitch and Codex use. Organizer update says unlisted YouTube is acceptable, private is not. **Do not fake demo footage.**

## High-impact video storyboard (2:30 target)

| Video time | What real footage must show | Voice / caption message |
|---|---|---|
| 00:00–00:12 | Twitch stream with compact puzzle overlay appearing while primary game visible | "One minute of downtime becomes a shared mystery." |
| 00:12–00:30 | Real chat from verified viewer `!look CAM` → evidence animation | "Chat finds evidence directly in Twitch." |
| 00:30–00:45 | Second viewer links clue, valid proof cue, quick reveal | "It's not votes; the evidence changes game state." |
| 00:45–01:10 | Switch to full mystery dashboard and stage overlay | "Same engine, deeper investigation." |
| 01:10–01:32 | Timeline correction and theory refutation; concise reconstruction | "Wrong theories are tested, not punished." |
| 01:32–02:02 | **Only if truly working:** 2 live broadcaster channels showing A/B actions and one shared proof | "Two communities, two workstations, one truth." |
| 02:02–02:20 | Code editor/Codex session showing real development/tests or session record | "Built using Codex, deterministic proof tests and EventSub." |
| 02:20–02:30 | Final Cluenite mark, concise CTA and real recap UI | "Every clue brings us together." |

If real co-op isn't ready, replace that 30s with actual stability/latency/accessibility footage and do not claim it works.

## Submission required material

- Repo link (public or properly shared private GitHub/GitLab), source and asset licenses, `.env.example`, `README` install/deploy instructions, testing access, no secrets.
- YouTube demo URL, <3 minutes and clearly shows functioning Twitch integration and Codex usage.
- English project description and instructions (or translation if Indonesian). Suggested copy below.
- Valid Codex session ID from thread where most build happened. Don't fabricate IDs. In Codex, obtain via `/status` as organizer notes.
- Team members/invitations accepted if applicable; Devpost status shows **Submitted**.

## English short description draft (edit to match ACTUAL implemented features)

> Cluenite is a Twitch-native social detective game that turns live chat into a team of investigators. A streamer starts a bite-sized mystery as an OBS overlay while continuing their main stream. Viewers uncover evidence and challenge theories using short chat commands. A deterministic case engine verifies the proof and presents a satisfying reveal. Our longer case mode expands the same interactions into a connected investigation. Built with OpenAI Codex, Twitch OAuth/EventSub, realtime session sync and browser overlays.

Remove the longer-mode claim if not truly implemented. Add co-op claim ONLY after testing with real authenticated A/B channels.

## English one-sentence value prop

"Turn downtime into a mystery. Turn chat into investigators."

## Judge-focused checklist

**Innovation:** show one viewer-originated evidence link/challenge that changes the scene, not just a poll.  
**Impact:** show no viewer registration; streamer game remains visible, plus more ambitious longer mode if ready.  
**Implementation:** real Twitch chat, server proof validation, state persistence and show how Codex was used.  
**Design:** visually legible overlay, minimal command instruction, satisfying proof and reveal, safe for broadcast.

## Submission pitfalls

- A narrated slideshow is not a live feature demonstration.
- A standalone local fake chat is not a real Twitch integration.
- A case that "solves" on guessed conclusion without proof weakens innovation claim.
- Don't include copyrighted game music/media in video without permission. Capture streamer gameplay only if you have rights to show it; a generic self-produced game-like scene is a safe substitute.
- Don't run after deadline with last-minute changes to submitted assets; organizer says freeze repo/video/links following submission window.
