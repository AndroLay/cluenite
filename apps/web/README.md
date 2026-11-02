# Cluenite web

Vue 3 and TypeScript provide the public site, browser practice cases, authenticated live investigations, host controls, co-op stations and read-only OBS views. PixiJS renders the investigation scenes. The interface uses English throughout.

From the repository root, `pnpm dev` starts Vite on port 5173 and the API on port 10000. Use [setup](../../docs/setup.md) for environment and proxy configuration. Production uses the API's single origin and built apps/web/dist assets.

[PRODUCT.md](PRODUCT.md) describes the routes and feature boundaries; [DESIGN.md](DESIGN.md) records the Cinematic Brown Noir system. [API contracts](../../docs/api.md) define saved sessions, host lifecycle, scoped overlay links, invitations and explicit rejoin.

Practice cases in src/sampleCase use labeled scripted chat and browser rules. They do not create persisted live sessions or submit Twitch commands. Live views consume server projections, stable retry keys and authorized team snapshots. Keep proof rules, provider tokens and viewer identity out of the browser bundle.

See [testing](../../docs/testing.md), [browser fixtures](../../tests/e2e/README.md) and [current status](../../docs/STATUS.md) for verification boundaries. [Attribution](../../docs/attribution.md) records runtime art and bundled font notices.
