# Blueprint v1.0 case fixtures

These three JSON files are copied byte-for-byte from
`docs/reference/Cluenite_Complete_Blueprint_v1.0/07_DATA_FIXTURES/`:

- `q01_gallery_shadow.json`
- `m01_missing_trophy.json`
- `c01_harbor_signal.json`

They are reference inputs, not yet runtime-validated or safe for public web
delivery. Keep complete answer keys on the server and publish only an explicit
sanitized projection.

Status: non-authoritative. The v3 spec in `docs/reference/Cluenite_Implementation_Ready_v3/`
takes precedence over Blueprint v1.0 (see `docs/architecture/DECISIONS.md`). The
runtime case is `packages/cases/src/q01GalleryShadow.ts`, which follows v3. Do not
load these JSON files as runtime case data.
