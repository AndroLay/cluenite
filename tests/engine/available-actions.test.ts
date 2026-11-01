import { describe, expect, it } from "vitest";
import {
  C01_HARBOR_SIGNAL,
  M01_MISSING_TROPHY,
  Q01_GALLERY_SHADOW,
} from "../../packages/cases/src/index.js";
import {
  applyCommand,
  createRound,
  setPaused,
  toRoundSnapshot,
} from "../../packages/engine/src/index.js";

describe("state-aware available actions", () => {
  it("offers a Q01 link only after both evidence records are unlocked", () => {
    let state = createRound(Q01_GALLERY_SHADOW, {
      sessionId: "q01-actions",
      source: "live",
    });

    expect(toRoundSnapshot(state, 0).availableActions).toEqual(["look"]);

    state = applyCommand(state, "!look CAM", 1).state;
    expect(toRoundSnapshot(state, 1).availableActions).not.toContain("link");
    expect(toRoundSnapshot(state, 1).availableActions).not.toContain("solve");

    state = applyCommand(state, "!look SCHEDULE", 2).state;
    expect(toRoundSnapshot(state, 2).availableActions).toContain("link");
    expect(toRoundSnapshot(state, 2).availableActions).not.toContain("solve");

    state = applyCommand(state, "!link CAM_R07 SCHEDULE_R07", 3).state;
    expect(toRoundSnapshot(state, 3).availableActions).toContain("solve");

    state = applyCommand(state, "!solve ROBOT", 4).state;
    expect(toRoundSnapshot(state, 4).availableActions).toEqual([]);
  });

  it("does not advertise M01 ordering or challenges before prerequisites exist", () => {
    let state = createRound(M01_MISSING_TROPHY, {
      sessionId: "m01-actions",
      source: "live",
    });
    expect(toRoundSnapshot(state, 0).availableActions).not.toContain("order");
    expect(toRoundSnapshot(state, 0).availableActions).not.toContain(
      "challenge",
    );

    for (const [index, clue] of ["CASE", "ACCESS", "TROLLEY"].entries()) {
      state = applyCommand(state, `!look ${clue}`, index + 1).state;
    }
    expect(toRoundSnapshot(state, 4).availableActions).toContain("order");
    expect(toRoundSnapshot(state, 4).availableActions).not.toContain(
      "challenge",
    );

    state = applyCommand(state, "!theory BLACKOUT_THEFT", 5).state;
    expect(toRoundSnapshot(state, 5).availableActions).toContain("challenge");

    state = setPaused(state, true, 6);
    expect(toRoundSnapshot(state, 6, null, "PAUSED").availableActions).toEqual(
      [],
    );
  });

  it("keeps co-op station actions scoped to each team's public snapshot", () => {
    const state = createRound(C01_HARBOR_SIGNAL, {
      sessionId: "c01-actions",
      source: "live",
    });
    const teamA = toRoundSnapshot(state, 0, "A", "ACTIVE").availableActions;
    const teamB = toRoundSnapshot(state, 0, "B", "ACTIVE").availableActions;

    expect(teamA).toContain("scan");
    expect(teamA).not.toContain("verify");
    expect(teamA).not.toContain("share");
    expect(teamB).toContain("verify");
    expect(teamB).not.toContain("scan");
    expect(teamB).not.toContain("share");
  });
});
