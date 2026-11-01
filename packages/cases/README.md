# Authored cases

Runtime definitions are exported from `src/index.ts`:

| ID                   | Title                        | Mode    |
| -------------------- | ---------------------------- | ------- |
| `Q01_GALLERY_SHADOW` | The Gallery Shadow           | quick   |
| `M01_MISSING_TROPHY` | The Missing Festival Trophy  | mystery |
| `C01_HARBOR_SIGNAL`  | Signal of the Invisible Ship | coop    |

The pure engine validates authored graphs and evaluates their proof. Definitions include private answers and prerequisites; production browser code must receive only public metadata/snapshots, never complete case definitions.

Author content and feedback in English. Q01 links use released evidence IDs; clue IDs are inspection targets. `ACCESS` is contextual Q01 information, not a linkable evidence record.

JSON files in [reference fixtures](fixtures/reference-v1.0/README.md) are preserved blueprint examples, not runtime imports. The public manuscript sample in `apps/web/src/site/QuickSamplePage.vue` is a separate UI demonstration, not a fourth authored engine case.
