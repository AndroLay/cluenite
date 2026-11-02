import { describe, expect, it } from "vitest";
import {
  EXPRESS,
  LIGHTHOUSE,
  type BoardCaseDef,
} from "../../apps/web/src/sampleCase/boardCases.js";
import {
  accuse,
  ask,
  challenge,
  createBoard,
  flip,
  link,
  openRequest,
  parseBoardCommand,
  partnerFinds,
  proof,
  receive,
  scoreBoard,
  share,
  startBoard,
} from "../../apps/web/src/sampleCase/boardEngine.js";

function playing(def: BoardCaseDef) {
  const state = createBoard(def);
  startBoard(state, 0);
  return state;
}

describe("local practice board proof", () => {
  it("keeps the Express verdict locked until the key deduction and lie are proved", () => {
    const state = playing(EXPRESS);
    expect(accuse(EXPRESS, state, "CONDUCTOR", 1_000).code).toBe(
      "NOT_AVAILABLE",
    );
    expect(link(EXPRESS, state, "TICKET", "WATCH").code).toBe("NOT_AVAILABLE");
    for (const id of ["TICKET", "WATCH", "CLASP", "PUNCH"]) {
      flip(EXPRESS, state, id, "you");
    }
    link(EXPRESS, state, "CLASP", "PUNCH");
    expect(proof(EXPRESS, state).done).toBe(0);
    expect(challenge(EXPRESS, state, "CARRIAGE", "WATCH").code).toBe("INVALID");
    expect(state.broken).toEqual([]);
    link(EXPRESS, state, "TICKET", "WATCH");
    expect(accuse(EXPRESS, state, "CONDUCTOR", 2_000).code).toBe(
      "NOT_AVAILABLE",
    );
    challenge(EXPRESS, state, "CARRIAGE", "TICKET");
    expect(proof(EXPRESS, state).complete).toBe(true);
    expect(accuse(EXPRESS, state, "MAGICIAN", 3_000).code).toBe("INVALID");
    expect(state.phase).toBe("playing");
    expect(state.wrongAccusations).toBe(1);
    expect(accuse(EXPRESS, state, "CONDUCTOR", 4_000).code).toBe(
      "ACCEPTED_NEW",
    );
    expect(state.phase).toBe("solved");
    expect(state.verdict).toBe("CONDUCTOR");
  });

  it("does not award repeated finds, reversed links, challenges, or verdicts twice", () => {
    const state = playing(EXPRESS);
    flip(EXPRESS, state, "TICKET", "chat");
    flip(EXPRESS, state, "WATCH", "you");
    link(EXPRESS, state, "TICKET", "WATCH", true);
    challenge(EXPRESS, state, "CARRIAGE", "TICKET");
    expect(scoreBoard(EXPRESS, state).total).toBe(1_150);
    expect(flip(EXPRESS, state, "TICKET", "chat").code).toBe(
      "ACCEPTED_ALREADY_KNOWN",
    );
    expect(link(EXPRESS, state, "WATCH", "TICKET", true).code).toBe(
      "ACCEPTED_ALREADY_KNOWN",
    );
    expect(challenge(EXPRESS, state, "CARRIAGE", "TICKET").code).toBe(
      "ACCEPTED_ALREADY_KNOWN",
    );
    expect(scoreBoard(EXPRESS, state).total).toBe(1_150);
    accuse(EXPRESS, state, "CONDUCTOR", 100_000);
    expect(scoreBoard(EXPRESS, state).total).toBe(2_550);
    expect(accuse(EXPRESS, state, "CONDUCTOR", 110_000).code).toBe(
      "NOT_AVAILABLE",
    );
    expect(scoreBoard(EXPRESS, state).total).toBe(2_550);
    expect(state.solvedAt).toBe(100_000);
  });
});

describe("local co-op practice trading", () => {
  it("records an early share without inventing a request or quick hand-off bonus", () => {
    const state = playing(LIGHTHOUSE);
    flip(LIGHTHOUSE, state, "WICK", "you");
    expect(share(LIGHTHOUSE, state, "WICK", 1_000).cue).toMatchObject({
      kind: "shared",
      request: null,
      quick: false,
    });
    expect(state.shared).toEqual(["WICK"]);
    expect(scoreBoard(LIGHTHOUSE, state).total).toBe(100);
    openRequest(state, "WICK", 26_000);
    openRequest(state, "WICK", 26_001);
    expect(state.requests).toEqual([]);
    expect(state.partnerFound).toEqual([]);
    expect(state.seen).toEqual(["WICK"]);
    expect(scoreBoard(LIGHTHOUSE, state).total).toBe(100);
  });

  it("requires evidence from both stations and the captain's broken lie", () => {
    const state = playing(LIGHTHOUSE);
    flip(LIGHTHOUSE, state, "WICK", "you");
    flip(LIGHTHOUSE, state, "LOG", "you");
    expect(flip(LIGHTHOUSE, state, "TIDE", "you").code).toBe("NOT_AVAILABLE");
    partnerFinds(state, "TIDE");
    expect(state.seen).not.toContain("TIDE");
    expect(ask(LIGHTHOUSE, state, "TIDE").code).toBe("ACCEPTED_NEW");
    expect(link(LIGHTHOUSE, state, "WICK", "TIDE").code).toBe("NOT_AVAILABLE");
    receive(LIGHTHOUSE, state, "TIDE");
    receive(LIGHTHOUSE, state, "RADIO");
    link(LIGHTHOUSE, state, "WICK", "TIDE");
    link(LIGHTHOUSE, state, "LOG", "RADIO");
    expect(proof(LIGHTHOUSE, state).done).toBe(2);
    expect(accuse(LIGHTHOUSE, state, "CAPTAIN", 80_000).code).toBe(
      "NOT_AVAILABLE",
    );
    expect(challenge(LIGHTHOUSE, state, "WARNING", "BOAT").code).toBe(
      "NOT_AVAILABLE",
    );
    receive(LIGHTHOUSE, state, "BOAT");
    challenge(LIGHTHOUSE, state, "WARNING", "BOAT");
    expect(proof(LIGHTHOUSE, state).complete).toBe(true);
    expect(accuse(LIGHTHOUSE, state, "CAPTAIN", 90_000).code).toBe(
      "ACCEPTED_NEW",
    );
    expect(state.verdict).toBe("CAPTAIN");
  });

  it.each(["opening", "solved"] as const)(
    "does not share cards while the case is %s",
    (phase) => {
      const state = playing(LIGHTHOUSE);
      flip(LIGHTHOUSE, state, "WICK", "you");
      openRequest(state, "WICK", 1_000);
      state.phase = phase;
      const before = structuredClone(state);
      expect(share(LIGHTHOUSE, state, "WICK", 2_000).code).toBe(
        "NOT_AVAILABLE",
      );
      expect(state).toEqual(before);
    },
  );

  it.each(["opening", "solved"] as const)(
    "does not ask for cards while the case is %s",
    (phase) => {
      const state = playing(LIGHTHOUSE);
      state.phase = phase;
      const before = structuredClone(state);
      expect(ask(LIGHTHOUSE, state, "BOAT").code).toBe("NOT_AVAILABLE");
      expect(state).toEqual(before);
    },
  );

  it.each([
    { answeredAt: 21_000, quick: true, total: 400 },
    { answeredAt: 21_001, quick: false, total: 300 },
  ])(
    "scores the hand-off deadline at $answeredAt without duplicate credit",
    ({ answeredAt, quick, total }) => {
      const state = playing(LIGHTHOUSE);
      openRequest(state, "WICK", 1_000);
      expect(share(LIGHTHOUSE, state, "WICK", 2_000).code).toBe(
        "NOT_AVAILABLE",
      );
      expect(share(LIGHTHOUSE, state, "TIDE", 2_000).code).toBe("INVALID");
      flip(LIGHTHOUSE, state, "WICK", "you");
      expect(share(LIGHTHOUSE, state, "WICK", answeredAt).cue).toMatchObject({
        kind: "shared",
        quick,
      });
      expect(scoreBoard(LIGHTHOUSE, state).total).toBe(total);
      expect(share(LIGHTHOUSE, state, "WICK", answeredAt + 1).code).toBe(
        "ACCEPTED_ALREADY_KNOWN",
      );
      openRequest(state, "WICK", answeredAt + 2);
      expect(state.requests).toHaveLength(1);
      expect(scoreBoard(LIGHTHOUSE, state).total).toBe(total);
    },
  );
});

describe("practice board commands", () => {
  it("normalizes commands and rejects unsupported arity or solo station trading", () => {
    expect(parseBoardCommand(EXPRESS, "  !LiNk ticket watch  ")).toEqual({
      kind: "link",
      a: "TICKET",
      b: "WATCH",
    });
    expect(parseBoardCommand(LIGHTHOUSE, "!ask boat")).toEqual({
      kind: "ask",
      card: "BOAT",
    });
    expect(parseBoardCommand(EXPRESS, "!link TICKET WATCH EXTRA").kind).toBe(
      "invalid",
    );
    expect(parseBoardCommand(EXPRESS, "!share TICKET").kind).toBe("invalid");
    expect(parseBoardCommand(LIGHTHOUSE, "!solve").kind).toBe("invalid");
  });
});
