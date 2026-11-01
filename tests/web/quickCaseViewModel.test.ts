import { describe, expect, it } from "vitest";
import { Q01_GALLERY_SHADOW } from "../../packages/cases/src/index.js";
import {
  applyCommand,
  createRound,
  toRoundSnapshot,
} from "../../packages/engine/src/index.js";
import { quickCaseFromSnapshot } from "../../apps/web/src/quickCase/viewModel.js";

describe("Quick Case server snapshot mapping", () => {
  it("maps unlocked evidence IDs and server-available link actions", () => {
    let state = createRound(Q01_GALLERY_SHADOW, {
      sessionId: "quick-view-model",
      source: "live",
    });
    state = applyCommand(state, "!look CAM", 1).state;
    state = applyCommand(state, "!look SCHEDULE", 2).state;

    const view = quickCaseFromSnapshot(toRoundSnapshot(state, 3));

    expect(view.evidence.map((item) => item.id)).toEqual([
      "CAM_R07",
      "SCHEDULE_R07",
    ]);
    expect(view.availableActions).toContain("link");
  });
});
