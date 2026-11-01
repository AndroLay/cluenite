# Eight Authored Quick Case Seeds (Prototype Content Library)

**State:** game-design seeds; `07_DATA_FIXTURES/quick_cases.json` contains normalized structural sample for three. Implementers must author art and validate the remaining five before releasing. **Don't advertise eight playable cases unless implemented and QA-passed.** Duration is target and can be untimed.

## Q01 — The Gallery Shadow (Spot + Match)

**Hook:** "The gallery door stayed locked. What triggered the alarm?"  
**Clues:** `CAM` photo shows moving low object with label R-07 at 21:10; `ROUTE` lists R-07 floor-cleaner in gallery 21:09–21:13; `SENSOR` registers movement in lower beam at 21:10, with zone aligned to R-07 route.  
**Chat:** `!look CAM`, `!look ROUTE`, `!look SENSOR`, `!link CAM_R07 ROUTE_R07`, `!solve R07`.  
**Solution:** autonomous cleaner R-07 caused movement detection. Requires identity link + sensor evidence.  
**Reveal:** bright beam animation scans a tiny friendly robot; card reads `MYSTERY SOLVED · FALSE ALARM`.  
**H1:** Check object markings. **H2:** Compare label and schedule. **H3:** Sensor is low to the ground.  
**Why fun:** apparent intruder turns out to be a helpful machine.

## Q02 — The Cup That Floated (Spot the Oddity)

**Hook:** "Why does the mug in this security clip appear to float?"  
**Clues:** `FRAME1` before image shows transparent display shelf; `FRAME2` 'floating' mug at same coordinates, reflected thin shelf border; `ANGLE` alternative camera reveals transparent bracket.  
**Chat:** `!look ANGLE`, `!link FRAME2 ANGLE`, `!solve CLEAR_SHELF`.  
**Solution:** concealed clear shelf; no supernatural cause. Only identify transparent bracket after angle unlock; no time pressure.  
**Reveal:** side-view parallax exposes supporting shelf.

## Q03 — The Backwards Clock (Timeline)

**Hook:** "One recording claims to show the future. What's wrong?"  
**Clues:** `CAM_A` 21:05 local wall clock, `CAM_B` camera stamp 20:07, `SYNC` shows camera B time offset -60 minutes; same passerby crosses hallway at 21:07 real time.  
**Chat:** `!look SYNC`, `!order A B EXIT` if sequence context given; `!solve CLOCK_OFFSET`.  
**Solution:** unsynchronized camera time, not time travel. Required `SYNC` matched to hallway event.  
**Reveal:** video clock rolls forward 60 minutes while scene stays unchanged.

## Q04 — The Vanished Parcel (Connection)

**Hook:** "A parcel is marked delivered, but reception says it never arrived."  
**Clues:** barcode `PK-42`; receipt scanner `PK-42`; receiving shelf photo shows package labeled PK-24; manifest explains `PK-42` placed in locker L2 instead of front desk (verified locker scan).  
**Chat:** `!link RECEIPT LOCKER`, `!solve L2`.  
**Solution:** delivered to locker L2, not reception. Don't treat barcode transposition alone as proof; require locker scan.

## Q05 — The Silent Piano (Pattern)

**Hook:** "Four lamps blink beside a locked music box. Which switch opens it?"  
**Clues:** lamp sequence circle-triangle-circle-square and engraved guide `circle=1, triangle=2, square=3`; panel requires 1-2-1-3.  
**Chat:** `!code 1213`.  
**Solution:** 1213; format teaches mapping with one worked example.  
**Reveal:** mechanical music box opens silently, paper clue appears (no copyrighted melody).

## Q06 — The Wrong Footprint (Challenge)

**Hook:** "A note says the intruder wore heavy boots. Is that supported?"  
**Clues:** photo `PRINT` narrow wheel track; `BOOTS` statement 'loud footwear'; `CART` wheel tread matches track; `HALL` records a trolley in the corridor.  
**Chat:** `!challenge BOOT_THEORY PRINT`, `!link PRINT CART`.  
**Solution:** boots theory unsupported/contradicted by wheel-trace match; no claim about actual intruder identity.

## Q07 — The Extra Guest (Visual Count)

**Hook:** "There are six chairs, but the table plan lists only five guests. What's the sixth for?"  
**Clues:** booking list shows 5; venue plan has chair labeled `CAMERA`; arrival photo shows tripod position beside table.  
**Chat:** `!look PLAN`, `!solve CAMERA_SEAT`.  
**Solution:** chair temporarily used for camera equipment, not a hidden guest.  
**Reveal:** camera bag pops into frame, harmless humorous twist.

## Q08 — The Noisy Elevator (Causal Challenge)

**Hook:** "The lift stops on floor three only when the bell sounds. What's causing it?"  
**Clues:** button logs and bell-power logs for 3 tests: floor 3 / bell on -> stops; floor 3 / bell off -> passes; floor 2 / bell on -> passes.  
**Chat:** `!theory BELL_AND_FLOOR3`, `!challenge FLOOR_ONLY TEST2`, `!solve INTERLOCK`.  
**Solution:** safety interlock requires floor 3 AND active bell signal, as defined by the authored training mechanism. Must not generalize as actual real-world elevator behavior.  
**Reveal:** relay diagram connects two conditions and clicks open.

## Sequencing recommendation

Launch **Q01** as mandatory MVP. Add Q03 (timeline) and Q05 (symbol code) if time permits to prove variation. Q02/Q04/Q06/Q07/Q08 are post-core content. Validate art, commands, proof and time with humans before "published".

## Localized presentation guidance

Use English asset titles for English Twitch demo, concise bilingual labels only if full localization is implemented. Don't make an answer depend on English wordplay. Every case includes alt text and reduced-motion reveal.
