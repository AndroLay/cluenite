# 07 — Fairness, Delight, Accessibility, Frustration Budget

## Don't make people feel they are taking an exam

- One clearly worded question at a time.
- Distinguish **what is observed** vs **what we infer** using both icons and labels.
- Every clue uses short copy (ideal overlay sentence under 100 characters, longer docs expandable in dashboard).
- Wrong inputs produce gentle feedback and optionally a hint, never eliminate user or reset entire case.
- Cases should have at least one "obvious" early success.
- Max three unreviewed open theories visible simultaneously; archive older theories.
- No punishment for silent chat, slow mobile viewer or disconnected streamer.

## Cognitive accessibility

- 14–16px dashboard body minimum, overlay designed for downscaled 1080p stream with 26–34px primary prompts in native 1920×1080 composition.
- Avoid text-only cues. Each evidence object has a unique ID, icon and description (not color-only).
- Color contrast: body text WCAG AA >=4.5:1; large text >=3:1. Verify using automated contrast checker.
- All time limits pausable or configurable; `untimed` for high-latency audiences.
- Keyboard navigation for dashboard; focus visibility; ARIA live only for important milestones.
- `prefers-reduced-motion`: zero parallax, replace moving reveal with crossfade under 150ms, no shake/flash.
- Audio cues include subtitle/visual counterpart; no puzzle requires recognizing pure color or pitch alone.
- Viewers who cannot type can still follow story; accessibility of Twitch chat itself beyond product control should not be misrepresented.

## Fairness mechanics

- Server processes actions in an event-sourced revision sequence (Twitch EventSub may deliver duplicates and delayed messages).
- Same message deduped by Twitch `message_id` and transport notification ID as appropriate; durable dedupe across reconnect.
- Action per viewer cooldowns by puzzle and verb; don't blanket ban natural chat discussion.
- Identical suggestions map to a canonical key. Don't show every duplicate; eligible joint credit can be displayed as verified participant count.
- First-to-type may be shown as "first valid received" only with clear latency caveat; never as proof of fastest human.
- Moderator bypass limited to moderation; moderators should not forge viewer accomplishments.
- Chat toxicity handling: minimize free text capture; escapes all usernames; redact profanity/untrusted arbitrary claims; chat message may be deleted/held by Twitch moderation.

## Risk register for gameplay fun

| Risk | Symptom | Mitigation | Kill test |
|---|---|---|---|
| Feels like homework | viewers stop responding when timeline shown | reduce to 3 cards, add illustration | cold viewers cannot describe next action |
| Chat as decoration | game solves itself without viewers | require valid viewer action for one meaningful state change; host fallback only if needed | replay case with chat removed looks identical |
| One side bored | Crew B watches Crew A for minutes | parallel optional work & role switching | >90s observed idle time on a crew in normal run |
| Click everything | brute-force object list | meaningful constraints, limited action attempts, contextual hints | majority solves with no explanation |
| Fast spam wins | few users monopolize credits | dedupe and contributor roles | credits correlate with repeated guesses, not distinct proof |
| Spoiler leaked | someone posts final truth | proof gate, suppress spoilers in overlay | player guesses final answer bypassing evidence |
| Game stalls | no hint and no valid viewer | host can invoke hint or inspect | case deadlocks |
| Visuals unreadable | mobile viewers can't read clues | stage zoom/large type, shortened text | 1080p downscale test fails |

## Playtest scripts

**Cold quick test (5–10 people):** show overlay without explanation for 10 seconds; ask "what can you do?"; observe first correct command, confusion, and request for replay.  
**20-viewer test:** record actual distinct contributions and failed command parses; do not reveal hidden answers in advance.  
**Two-stream test:** A vs B with deliberately uneven audience, introduce 6-second stream delay and a 2-minute disconnect, verify neither loses work.  
**Accessibility test:** simulate phone-scale playback, keyboard-only dashboard and reduced-motion.  
**Proof integrity test:** submit correct verdict before collecting required evidence; should fail with explanation of needed evidence category.
