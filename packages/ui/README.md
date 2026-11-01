# Shared UI utilities

The current package exports audio/SFX helpers, `prefersReducedMotion`, and the legacy v1 token stylesheet through `src/index.ts`. Most current DOM components live in `apps/web/src/components` and `apps/web/src/site`; this package is not a complete shared component library.

Keep labels, documentation, and comments in English, with keyboard access and reduced-motion support. The active web palette is Cinematic Brown Noir in `apps/web/src/style.css`, described by [web design](../../apps/web/DESIGN.md). Legacy blue token values remain for compatibility and provenance.

Authoritative gameplay stays outside UI utilities. Shared graphics timelines belong to `@cluenite/graphics`; current app-specific scenes live in `apps/web/src/scene`.
