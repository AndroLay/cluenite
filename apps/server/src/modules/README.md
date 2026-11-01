# Server module boundaries

Create one folder per domain from the architecture: auth, cases, sessions,
actions, evidence, realtime, Twitch, and persistence. Put HTTP and Socket.IO
transport code at the boundary; keep authoritative state changes deterministic
and validated by shared contracts. The bootstrap intentionally has no game
module until its state transitions and proof rules are implemented from the
blueprint.
