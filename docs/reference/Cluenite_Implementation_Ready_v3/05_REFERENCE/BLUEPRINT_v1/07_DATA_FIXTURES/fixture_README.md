# Fixture data for prototype and solver tests

- `q01_gallery_shadow.json`: complete authored micro-mystery prototype; commands inspect 3 objects, link camera-route and verdict R07.
- `m01_missing_trophy.json`: multi-step evidence / timeline; guess alone is insufficient.
- `c01_harbor_signal.json`: distinct `field` / `records` observations and joint relation.
- `validate_cases.py`: checks ID references, reachability, duplicate IDs, negative proof tests, and happy-path simulation; uses Python stdlib only.
- `validation_report.txt`: output of real validator run when packaged.

**Design example, not a running Twitch backend.** Your production code must perform domain transitions and Twitch permissions in a trusted server, with durable dedupe and real persistence. These fixtures intentionally omit chapter gating, case-specific `share` visibility, live Twitch auth, role-scoped WebSocket projections, and final illustration assets. They test static graph reachability and a limited action smoke path only.
