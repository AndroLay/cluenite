import { describe, expect, it } from "vitest";
import { M01_MISSING_TROPHY } from "../../packages/cases/src/index.js";
import {
  createRound,
  toRoundSnapshot,
} from "../../packages/engine/src/index.js";

describe("viewer-safe timeline options", () => {
  it("publishes reorderable event choices without publishing their solution order", () => {
    const state = createRound(M01_MISSING_TROPHY, {
      sessionId: "m01-timeline-options",
      source: "simulation",
    });
    const snapshot = toRoundSnapshot(state, 1_000);

    expect(snapshot.sequences[0]).toMatchObject({
      id: "MISSING_TROPHY_TIMELINE",
      events: [
        { id: "BLACKOUT", label: "Gallery blackout" },
        { id: "TROLLEY", label: "Covered trolley leaves the gallery" },
        { id: "OPEN", label: "Display case opened" },
        { id: "ORDER", label: "Safety work order issued" },
        { id: "HEAT", label: "Display temperature warning" },
      ],
    });
    expect(snapshot.sequences[0]).not.toHaveProperty("expectedOrder");
  });
});
