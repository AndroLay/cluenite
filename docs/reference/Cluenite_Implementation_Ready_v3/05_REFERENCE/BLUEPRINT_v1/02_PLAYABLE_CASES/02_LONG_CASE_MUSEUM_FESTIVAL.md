# CASE M01 — The Missing Festival Trophy (Playable Narrative Specification)

**Mode:** long solo Mystery Live (can map to two stations later)  
**Length:** aspirational 35–45 minutes; configurable/no hard time limit  
**Tone:** cozy backstage mystery with comedic relief, no violence  
**Question:** *Where did the Festival Star Trophy go, who moved it, and why?*

## Ground truth fixed before play

- 18:47: a photo confirms Trophy in display cabinet.
- 18:56: temperature sensor flags display lights overheating cabinet.
- 18:57: authorized coordinator sends signed work order: move trophy to cooled storage B4 for protection; technician Tessa has approved staff access.
- 18:58: staff access log confirms Tessa's credential opening cabinet.
- 18:59: cart bearing a snowflake/cold-room label crosses backstage holding protective case.
- 19:01: unrelated stage light blackout happens due to routine lighting reset, **not** cause of trophy movement.
- 19:02: emcee notices empty display and calls the trophy "missing"; message chain about move hadn't reached stage crew.
- 19:08: room B4 inventory scan confirms stored trophy serial `FST-24`, matching display serial.

Truth = approved **safety relocation**, not a theft. The moral is that absence and timing do not themselves establish wrongdoing. Every causal link has authored proof.

## Characters (illustration only, no animation requirement)

- **Tessa**, technician: brief portrait card, orange jacket, approved access.
- **Mara**, stage host: reported missing display based on incomplete information.
- **Niko**, safety coordinator: signed relocation work order.
- Non-suspect props: trophy, wheeled cart, temperature warning, camera log, cold-room door.

## Evidence definitions

| ID | Source | Verified observation | Early interpretation risk |
|---|---|---|---|
| `PHOTO_1847` | stage photo | trophy present at 18:47 | shows nothing about later actions |
| `EMPTY_1902` | stage photo | trophy absent at 19:02 | absence ≠ theft |
| `TEMP_1856` | sensor log | display exceeded safety threshold | possible reason, not authorization |
| `ORDER_1857` | signed work order | move `FST-24` to B4 for overheating | order authentic in fictional case |
| `ACCESS_1858` | access controller | Tessa's approved badge opened display | does not alone prove she carried trophy |
| `CART_1859` | CCTV | marked cold-room cart moved protective case | could be other item until serial confirmed |
| `BLACKOUT_1901` | stage control log | routine lighting reset 19:01 | not same event as access |
| `B4_SCAN_1908` | inventory scan | trophy serial `FST-24` in B4 | confirms current location |

## Scene / act graph

```
STAGE_INTRO (photo + question)
 ├── PHOTO_1847 ┐
 ├── EMPTY_1902 ┘ → ACT1 ACCESS_LOG → ACCESS_1858
 └── SENSOR_PANEL → TEMP_1856
ACT2 TIMELINE (ORDER, ACCESS, CART, BLACKOUT)
  → TIMELINE_PROVED → ACT3 BACKSTAGE
ACT3 BACKSTAGE → CART_1859 + B4_SCAN_1908 → TROPHY_FOUND
ACT4 WORKORDER → ORDER_1857 + ACCESS_1858 → THEORY_CHALLENGE
FINAL → require: ORDER + ACCESS + CART + B4_SCAN + TIMELINE_PROVED → AUTHORIZED_SAFETY_MOVE
```

## Commands that work in each act

**Intro:** `!look PHOTO`, `!look EMPTY`, `!look SENSOR`.  
**Act 1:** `!look ACCESS`, `!look TEMP`.  
**Act 2:** `!order ORDER ACCESS CART BLACKOUT` (explicit UI tells users that abbreviations map to four pictured cards).  
**Act 3:** `!look CART`, `!look B4`, `!link CART B4`.  
**Act 4:** `!look ORDER`, `!link ORDER ACCESS`, `!challenge THEFT ACCESS`. This challenge is only valid after both the 18:58 access and 19:01 blackout are unlocked, establishing their temporal contradiction.  
**Final:** streamer selects `AUTHORIZED_SAFETY_MOVE` then `Submit Verdict`; viewers may propose `!theory MOVE`.

## Story beats (exact host-friendly copy)

1. Opening: "At 18:47 the trophy sat proudly in its case. At 19:02, moments after a blackout, it was gone. Was it stolen?"
2. Early clue: "Someone opened the case **before** the blackout. That changes the timeline."
3. Timeline reveal: "The cart left the stage area two minutes before the lights went dark."
4. Twist: "We found the trophy — but is its move authorized?"
5. Reveal: "A safety relocation was mistaken for theft. The backstage message never reached the host."

## How a player can be wrong

- `THEFT_DURING_BLACKOUT`: rebut with cabinet open at 18:58 vs blackout 19:01.
- `TECHNICIAN_STOLE`: until work order appears, treat as unproven; after signed order+serial match, reject accusation.
- `POWER_FAILURE_MOVED_TROPHY`: no causal mechanism; present physical cart evidence.

## Hint ladders

- Timeline H1 "Place the events using their timestamps." H2 "The cart was seen before the blackout." H3 "ORDER → ACCESS → CART → BLACKOUT."
- Location H1 "What does the snowflake label suggest?" H2 "Search storage areas." H3 "Inspect B4."
- Verdict H1 "Finding the trophy doesn't establish why it moved." H2 "Who authorized its move?" H3 "Match work order, badge access, cart and storage serial."

## Final reveal — four panels

1. Heat sensor warning; display starts to glow amber.
2. Authorized work order with `FST-24`; Tessa carefully packs trophy.
3. Cart rolls toward B4 **before** the lighting reset.
4. Stage host looks surprised at empty case; "It was protected, not stolen."

## Optional flavor (never required to solve)

- An apologetic logistics sticky note; lighting technician's goofy scribble; backstage coffee cup; festival program.
- Credits: first accurate observer, timeline solvers, evidence connectors, proof challengers, both host and viewers if applicable.

## QA cases

- Guess correct verdict with no evidence → blocked.
- Correct timeline but no B4 scan → final verdict blocked.
- Contradiction to blackout theory shown even if no other culprit chosen.
- Inspection can be performed by one viewer or host fallback.
- Closing and reopening after Act 3 loads exact trophy location & proof links without replaying intro.
