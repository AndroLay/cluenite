# Shared graphics

The package currently exports GSAP evidence-link and reveal timeline builders from `src/quickCaseTimelines.ts`. App-specific Pixi scenes are implemented in `apps/web/src/scene`, with Vue wrappers in `apps/web/src/components`.

Animations present server-accepted state and never decide proof or verdicts. Dispose timelines and scene resources on teardown; preserve reduced-motion behavior and readable DOM content. Use English for comments and any authored text.

See [web design](../../apps/web/DESIGN.md) for the current Brown Noir direction and prototype-art limitations.
