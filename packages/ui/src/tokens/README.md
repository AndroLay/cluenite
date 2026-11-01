# Legacy design tokens

`design_tokens.json` is preserved from the v1 art-direction package; `tokens.css` mirrors those legacy values and is imported by `packages/ui/src/index.ts`.

These exports are retained for compatibility and provenance. They do not define the current web palette. Cinematic Brown Noir uses `--case-*` values in `apps/web/src/style.css`, with current rules in [web design](../../../../apps/web/DESIGN.md).

Keep legacy JSON/CSS values paired if intentionally changed; do not silently substitute them for active web tokens. Documentation, comments, and token descriptions use English.
