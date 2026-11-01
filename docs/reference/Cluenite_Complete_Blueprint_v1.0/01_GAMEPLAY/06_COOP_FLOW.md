# 06 — Co-op Mystery: Two Streamers, Two Communities, One Truth

## Signature: Cross-Community Breakthrough

One crew finds **observation**, another crew finds **interpretation / reference**, both run a complementary verification, and the game reveals a shared conclusion. This is the high-emotion Twitch-native feature, not merely two shared browser tabs.

## Roles (rotate per act)

- **Crew A / Field Station:** camera, observation, scene scans, evidence of physical phenomena.
- **Crew B / Records Station:** archives, sensor logs, reference patterns, witness schedules, analysis of document consistency.
- **Shared Evidence Board:** verified published facts, pending cross-matches, current jointly testable hypotheses, contribution provenance by channel.

Roles are distinct permissions and toolsets; neither station can alter the other station's instrument. However all "secrets" could be seen on public streams, so never rely on unbreakable secrecy.

## Lifecycle

```
HOST_A_CREATES → INVITES_B → B_ACCEPTS_OAUTH → BOTH_READY → CASE_START
    ↘ B_DECLINES → A_SOLO_OR_CANCEL
CASE_START → PARALLEL_WORK → SHARE_FACTS → CROSS_MATCH → JOINT_VERIFICATION
        ↘ COHOST_LOST → JOINT_PAUSE; SOLO_WORK_AVAILABLE → RESUME/B_EXPLICIT_LEAVE
JOINT_VERIFICATION → REVEAL → RECAP_BY_CREW → COMPLETE
```

- A invites B with signed short-lived token tied to case and intended Twitch broadcaster ID.
- B authenticates and explicitly accepts; no automatic join from a Twitch raid, no channel takeover.
- Both see own station and overlay. Backend subscribes to the relevant chat channels with valid authorization for each.
- First milestone requires a valid A-side observation and B-side matching reference; not "A ready + B ready" alone.
- One joint test (not every action) asks each host to commit a meaningful local tool result. Server compares these against authored proof requirements.
- After reveal, station roles may swap on the next act, so one host is not always desk support.

## Reference case: The Invisible Ship Signal

### Story truth

At 21:30 a distant blinking light appears where radar shows no ship; cause is a harbor test buoy B-17 left transmitting after a scheduled check. Evidence supports source identity (not a universal claim that there can never be a ship nearby).

### Parallel assignments

A: locate light in quay P4; inspect `FLASH_PATTERN_212`; repeat camera sweep; validate physical shape `FLOATING_BUOY`.  
B: inspect `MANUAL_212`, `MAINT_B17`, `LOCATION_B17`, run reference signature check.

### Cross-Community Breakthrough

`A.FLASH_PATTERN_212` + `B.MANUAL_212` → provisional `MATCHED_CODE`, insufficient alone.  
`A.CAMERA_P4_BUOY` + `B.LOCATION_B17` → `SAME_REGION`.  
`A.SCAN_B17` + `B.REF_TEST_B17` → server validates signal signature, location and test-window; unlock `IDENTIFIED_B17`.

A could observe a matching light but not know its maintenance identity; B could know records but not prove which light is active. The simultaneous proof requires actual outputs from complementary instruments. Watchers on both channels can suggest the choices leading to these outputs.

## Collaboration design: keep both active

- Every parallel segment contains minimum two station-local tasks; if B needs more time, A has optional visual observation/camera sweep not a blocked waiting screen.
- Show the other crew's progress, not their private unverified draft theories, unless they publish a fact.
- On uneven audience sizes, actions are role-based. 1 viewer on B and 1,000 on A still works.
- Any co-host disconnect pauses joint verification; previously reached checkpoints stay. A/B may continue independent nodes; a downgrade to solo only after explicit approval, with alternative case proof path.
- Chat is a public live medium: if both channels use Shared Chat, preserve `source_broadcaster_user_id` in attribution. Otherwise process independent EventSub subscriptions.

## Positive/negative example

**Bad:** A votes blue, B votes red, 200 A viewers outvote 10 B viewers and "truth" changes.  
**Good:** A measures pattern 2-1-2, B finds exact engineering table and authorized deployment map. No matter audience size, the proof needs both measurements and records.

## Cross-channel credits

Record: `discovered_by`, `channel_id`, `node_id`, `event_id`, `proof_contribution`. Recap says "Crew A spotted pattern 2-1-2; Crew B matched the maintenance signature; together verified B-17." Show real acknowledged handles when privacy setting allows, never invent names or silently merge user identities.

## One-stream demo fallback

The same co-op case can be demonstrated as a **clearly labeled local simulation** with A/B test workstations, but a simulation MUST NOT be presented as real two-channel Twitch integration. For judging, capture real Twitch events from at least one channel; add a second actual broadcaster only if reliable in time.
