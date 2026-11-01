import { describe, expect, it } from "vitest";
import {
  AUTHORED_CASES,
  C01_HARBOR_SIGNAL,
  M01_MISSING_TROPHY,
  Q01_GALLERY_SHADOW,
} from "../../packages/cases/src/index.js";
import {
  applyCommand,
  createRound,
  validateCaseDefinition,
  type CaseDefinition,
} from "../../packages/engine/src/index.js";

describe("authored backend case definitions", () => {
  it("validates every case before a session can run", () => {
    for (const definition of AUTHORED_CASES) {
      expect(validateCaseDefinition(definition), definition.id).toEqual([]);
    }
  });
});

describe("Q01 proof guard", () => {
  it("does not accept a guessed verdict before the camera and schedule are linked", () => {
    let state = createRound(Q01_GALLERY_SHADOW, {
      sessionId: "q01",
      source: "live",
    });
    const premature = applyCommand(state, "!solve ROBOT", 0);
    expect(premature.result.code).toBe("INVALID");
    expect(premature.result.reason).toBe("VERDICT_UNPROVEN");
    expect(premature.state.revision).toBe(0);

    state = applyCommand(state, "!look CAM", 1).state;
    state = applyCommand(state, "!look SCHEDULE", 2).state;
    state = applyCommand(state, "!link CAM_R07 SCHEDULE_R07", 3).state;
    const solved = applyCommand(state, "!solve R07", 4);
    expect(solved.result.code).toBe("ACCEPTED_NEW");
    expect(solved.state.solvedBy).toBe("ROBOT");
    expect(applyCommand(solved.state, "!solve ROBOT", 5).result.code).toBe(
      "ACCEPTED_ALREADY_KNOWN",
    );
  });
});

describe("M01 mystery actions", () => {
  it("requires the authored timeline, a challenged theory, and recovery evidence", () => {
    let state = createRound(M01_MISSING_TROPHY, {
      sessionId: "m01",
      source: "live",
    });
    state = applyCommand(state, "!look PHOTO", 1).state;
    state = applyCommand(state, "!look CASE", 2).state;
    state = applyCommand(state, "!look ACCESS", 3).state;
    state = applyCommand(state, "!look TROLLEY", 4).state;
    state = applyCommand(state, "!look WORK_ORDER", 5).state;

    const wrongOrder = applyCommand(
      state,
      "!order BLACKOUT HEAT ORDER OPEN TROLLEY",
      6,
    );
    expect(wrongOrder.result.reason).toBe("SEQUENCE_INVALID");
    expect(wrongOrder.state.revision).toBe(state.revision);

    const unproven = applyCommand(state, "!solve SAFETY_MOVE", 7);
    expect(unproven.result.reason).toBe("VERDICT_UNPROVEN");
    expect(unproven.result.missing).toContain("verified event order");
    expect(unproven.result.missing).toContain("theory challenge");

    state = applyCommand(
      state,
      "!order HEAT ORDER OPEN TROLLEY BLACKOUT",
      8,
    ).state;
    state = applyCommand(state, "!theory BLACKOUT_THEFT", 9).state;
    state = applyCommand(
      state,
      "!challenge BLACKOUT_THEFT ACCESS_RECORD",
      10,
    ).state;
    const solved = applyCommand(state, "!solve SAFE_MOVE", 11);
    expect(solved.result.code).toBe("ACCEPTED_NEW");
    expect(solved.state.solvedBy).toBe("SAFETY_MOVE");
  });

  it("serves hints without exposing proof predicates", () => {
    const state = createRound(M01_MISSING_TROPHY, {
      sessionId: "m01-hint",
      source: "live",
    });
    const hinted = applyCommand(state, "!hint", 1);
    expect(hinted.result.message).toContain("warning");
    expect(hinted.state.hintsUsed).toBe(1);
    expect(hinted.state.revision).toBe(1);
    expect(hinted.result.message).not.toContain("SAFETY_MOVE");
  });

  it("opens only an authored code and treats a retry as known", () => {
    const codedCase: CaseDefinition = {
      ...Q01_GALLERY_SHADOW,
      codes: [
        {
          id: "CAMERA_LOCK",
          expectedCode: "241",
          unlocks: ["CAM_R07"],
          successText: "The camera note opens.",
        },
      ],
    };
    let state = createRound(codedCase, { sessionId: "code", source: "live" });
    const wrong = applyCommand(state, "!code 999", 1);
    expect(wrong.result.reason).toBe("CODE_INVALID");
    expect(wrong.state.revision).toBe(0);

    state = applyCommand(state, "!decode 241", 2).state;
    expect(state.unlocked.has("CAM_R07")).toBe(true);
    expect(applyCommand(state, "!code 241", 3).result.code).toBe(
      "ACCEPTED_ALREADY_KNOWN",
    );
  });
});

describe("C01 co-op proof", () => {
  it("requires authentic, team-correct scan and verify actions shared by both channels", () => {
    let state = createRound(C01_HARBOR_SIGNAL, {
      sessionId: "c01",
      source: "live",
    });
    const unauthenticated = applyCommand(state, "!scan P4", 1, {
      actor: "host",
      team: "A",
    });
    expect(unauthenticated.result.code).toBe("NOT_AUTHORIZED");
    expect(unauthenticated.state.revision).toBe(0);

    state = applyCommand(state, "!scan P4", 2, {
      actor: "twitch",
      team: "A",
    }).state;
    const wrongStation = applyCommand(state, "!verify B17", 3, {
      actor: "twitch",
      team: "A",
    });
    expect(wrongStation.result.code).toBe("NOT_AUTHORIZED");
    expect(wrongStation.state.revision).toBe(state.revision);

    state = applyCommand(state, "!share SCAN_P4", 4, {
      actor: "twitch",
      team: "A",
    }).state;
    const oneTeamOnly = applyCommand(state, "!solve BUOY", 5);
    expect(oneTeamOnly.result.reason).toBe("VERDICT_UNPROVEN");

    state = applyCommand(state, "!verify B17", 6, {
      actor: "twitch",
      team: "B",
    }).state;
    state = applyCommand(state, "!share MANUAL_B17_212", 7, {
      actor: "twitch",
      team: "B",
    }).state;
    expect(state.unlocked.has("JOINT_PROOF_B17")).toBe(true);
    expect(state.sharedEvidence.has("SCAN_P4")).toBe(true);
    expect(state.sharedEvidence.has("MANUAL_B17_212")).toBe(true);

    const teamA = awaitSnapshot(state, 8, "A");
    const teamB = awaitSnapshot(state, 8, "B");
    expect(teamA.clues.map((clue) => clue.id)).toEqual(["COAST"]);
    expect(teamB.clues.map((clue) => clue.id)).toEqual(["RADAR", "MANUAL"]);
    expect(teamA.evidence.map((item) => item.id)).toContain("JOINT_PROOF_B17");
    expect(teamB.evidence.map((item) => item.id)).toContain("JOINT_PROOF_B17");

    const solved = applyCommand(state, "!solve B17", 9, {
      actor: "twitch",
      team: "A",
    });
    expect(solved.result.code).toBe("ACCEPTED_NEW");
  });
});

function awaitSnapshot(
  state: ReturnType<typeof createRound>,
  now: number,
  team: "A" | "B",
) {
  return importSnapshot(state, now, team);
}

// Keep the test's projection path identical to production while avoiding an
// asynchronous import in Vitest's sync test body.
import { toRoundSnapshot } from "../../packages/engine/src/index.js";
function importSnapshot(
  state: ReturnType<typeof createRound>,
  now: number,
  team: "A" | "B",
) {
  return toRoundSnapshot(state, now, team);
}
