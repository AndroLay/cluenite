# Sound, FX, Dialogue, Narrative Tone

## Sound policy

Sound is **optional** and disabled by default in compact OBS mode to avoid stepping on streamer audio or copyrighted music. If enabled, sounds are original/licensed and subtle, with simultaneous visual/text feedback.

| Cue | Target length | Sound character | Visual equivalent |
|---|---:|---|---|
| Clue found | 0.25–0.45s | soft glass/paper tap | gold chip/badge |
| Link verified | 0.4–0.65s | two gentle ascending ticks | teal line draws |
| Theory challenged | 0.35–0.6s | paper swipe, soft thump | coral underline |
| Puzzle solved | 1–2s | playful short chord (original composition only) | reveal animation + 'SOLVED' |
| Joint breakthrough | 0.9–1.4s | alternating A/B chimes resolving together | teal/lilac merge |
| Wrong input | none by default | do not beep/scold chat | quiet "Not supported yet" state |
| Disconnect | none by default | no panic siren | unobtrusive reconnection chip |

No speech synthesis as foundation. Avoid copyrighted film/game jingles, stock tracks without rights, and any copyrighted compositions.

## FX guidelines

- Particles max 8–16 per major reveal, no full-screen burst.
- Blur and glow constrained; essential text never under bloom.
- No rapid flashing/pulsing; preserve color-blind-readable shapes and text.
- Use reusable SVG symbols/paths; GPU-friendly CSS transforms.
- Visual evidence found: icon → small flourish → verified chip. Do not move the actual evidence away from the user's reading target before they register it.

## Copywriting tone

- Curious, witty, restrained; never gruesome, humiliating, or accusatory toward real viewers.
- Prompts under 90 characters on quick overlay, one crisp sentence for clue; long story paragraphs ≤2–3 sentences unless optional expandable narrative.
- Good: "Wait. That door opened three minutes **before** the blackout."  
- Bad: "You are an idiot; obviously the guard did it" or twelve lines of technical sensor exposition.
- Wrong: "That link doesn't prove the theory yet. Try another piece of evidence."
- Correct: "The timestamp changes everything. The cabinet opened first."
- Reveal: "It wasn't stolen. The trophy was moved to protect it."

## Micro-narrative recipe

1. Establish ordinary situation.
2. Introduce one impossible-seeming observation.
3. Present concrete evidence.
4. Encourage at least one tempting but unproven interpretation.
5. Give an accessible experiment/contradiction path.
6. Reveal a human/physical explanation with a small humorous or warm beat.

Use funny misunderstandings, unexpected mundane causes, meaningful teamwork and story twists. Don't force shock endings. Every turn must feel fair with information available earlier.
