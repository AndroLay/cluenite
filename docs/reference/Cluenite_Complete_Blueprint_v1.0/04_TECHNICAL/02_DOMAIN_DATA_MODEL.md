# Data Model, Event Log, Truth Graph & Migration Design

## Core entities / primary keys

**users**: `id(uuid)`, `twitch_user_id(unique)`, `display_name`, `created_at`, `updated_at`. Twitch IDs stable; names are not.

**broadcaster_connections**: `id`, `user_id`, `twitch_user_id`, `access_token_ciphertext`, `refresh_token_ciphertext`, `scopes_json`, `expires_at`, `connection_status`. Do not store plaintext or expose to client.

**cases**: `id(text)`, `active_version`, `title`, `mode_compatibility_json`, `published`, `content_rating`.

**case_versions**: PK `(case_id, version)`, `spec_json`, `content_sha256`, `validated_at`, `source_revision`; immutable once used in a session.

**sessions**: `id(uuid)`, `case_id`, `case_version`, `mode`, `status`, `host_user_id`, `current_chapter`, `revision(bigint)`, `started_at`, `paused_at`, `ended_at`.

**session_channels**: PK `(session_id, twitch_channel_id)`, `host_user_id`, `station_role`, `consented_at`, `connection_status`; distinct authenticated broadcasters for co-op.

**session_facts**: PK `(session_id, evidence_id)`, `unlocked_at`, `source_channel_id`, `unlocked_by_action_id`.

**session_theories**: PK `(session_id,theory_id)`, `status`, `reason_evidence_ids`, `updated_revision`.

**session_links**: PK `(session_id,relation_id)`, `verified_at`, `source_action_id`.

**session_actions**: `id(uuid)`, `session_id`, `actor_twitch_id`, `source_channel_id`, `origin_message_id`, `verb`, `args_json`, `accepted`, `reason_code`, `received_at`, `applied_revision`, UNIQUE `source_channel_id, origin_message_id` for Twitch-originated messages; dashboard action idempotency key unique independently.

**twitch_notifications**: `notification_id(primary key)`, `subscription_id`, `received_at`, `processed_at`.

**domain_events**: PK `(session_id, revision, event_index)`, `event_type`, `payload_json`, `at`; enough to replay or audit critical transitions.

**contributions**: PK `(session_id, action_id, credit_type)`, `actor_twitch_id`, `source_channel_id`, `evidence_id`, `credit_type`; avoid arbitrary score estimates.

**overlay_tokens**: `id`, `session_id`, `scope`, `token_hash`, `expires_at`, `revoked_at`, `created_at`; only hash at rest, opaque raw tokens exposed once.

**coop_invites**: `id`, `session_id`, `inviter_twitch_id`, `invitee_twitch_id`, `invite_hash`, `expires_at`, `status`, `accepted_at`; invite bearer token bound to intended B identity.

## Recommended DB constraints

- `session.case_version` always references immutable case version.
- `status` enum: `prepared`, `running`, `paused`, `reconnecting`, `resolved`, `ended_partial`, `invalid`.
- `source_role` enum: `solo`, `field`, `records`.
- Unique case node IDs inside one case JSON; unique event revision per session.
- Dedupe via transaction: notification ID → parsed chat action ID → action application. Do not rely only on in-memory sets.
- Credentials encrypted and separated; rotate key procedure documented before production.
- No chat message raw-body retention by default; store normalized command and minimal attribution if required for proof and abuse prevention.

## Event sourcing examples

```
SESSION_STARTED {sessionId,caseVersion}
EVIDENCE_UNLOCKED {evidenceId, actorId, channelId}
RELATION_VERIFIED {relationId,evidenceIds,actorId}
THEORY_REFUTED {theoryId,relationId}
CHAPTER_ADVANCED {from,to}
JOINT_PROOF_VERIFIED {proofId,stationActionIds}
CASE_RESOLVED {verdictId,proofIds}
SESSION_PAUSED {reason}
```

Each event has monotonic session revision and is applied once. Durable `session_facts` etc can be materialized aggregates for fast projection; aggregate and log must commit in same DB transaction.

## Evidence truth requirements

```
verifiedRelation = relation.requiredFacts.every(f => sessionFacts.has(f))
correctVerdict = selectedVerdictId === case.truth.verdictId
              && case.truth.proofSets.some(set => set.every(r => verifiedRelationsOrFacts.has(r)))
```

Never accept `selectedVerdictId` alone. If a viewer guesses prematurely, tell them what category of proof remains, without leaking hidden solution.

## Case migration

Do not change case JSON used by active sessions. Instead publish version 2, migrate future sessions only; optionally run a narrowly scripted migration for active sessions with case-specific semantics. Tested old sessions must remain solvable.
