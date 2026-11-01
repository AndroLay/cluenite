# Web components

- `QuickCaseOverlay.vue`: Q01 presentation, evidence/link/verdict controls, feedback, and the compact read-only OBS card.
- `MysteryLiveBoard.vue`: M01/co-op investigation, evidence inspection, sequence/theory/challenge/hint controls.
- `CaseScene.vue` and `MysteryLiveScene.vue`: optional Pixi scene wrappers; implementations live in `../scene`.
- `DashboardPanel.vue`: authenticated host commands and lifecycle controls.
- `TwitchConnectionStatus.vue`: English, accessible connection-state announcements; hidden in OBS.

The public site and standalone manuscript sample live in `../site`. Keep all labels and accessibility text in English. Server snapshots determine accepted state; local selections are pending input. See [product behavior](../../PRODUCT.md) and [design rules](../../DESIGN.md).
