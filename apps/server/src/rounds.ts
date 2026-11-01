import type { CommandResult, RoundSnapshot, SessionControl } from "@cluenite/contracts";
import {
  applyCommand,
  createRound,
  restartRound,
  setPaused,
  toRoundSnapshot,
  type RoundState,
} from "@cluenite/engine";
import { Q01_GALLERY_SHADOW } from "@cluenite/cases";

// In-memory round authority. The engine decides every transition; this module only
// stores the latest state per session and reports whether the revision moved.
export const DEFAULT_SESSION_ID = "dev";

export interface Outcome {
  readonly result: CommandResult;
  readonly changed: boolean;
}

export interface RoundStore {
  snapshot(sessionId: string): RoundSnapshot | undefined;
  command(sessionId: string, text: string): Outcome;
  control(sessionId: string, action: SessionControl["action"]): Outcome;
}

function unknownSession(): Outcome {
  return {
    result: { code: "NOT_AVAILABLE", reason: null, message: "Unknown session.", missing: [], revision: 0 },
    changed: false,
  };
}

function toResult(next: RoundState, previousRevision: number, result: CommandResult): Outcome {
  return { result, changed: next.revision !== previousRevision };
}

// The clock is injected so the engine only ever receives plain millisecond values.
export function createRoundStore(now: () => number = Date.now): RoundStore {
  const rounds = new Map<string, RoundState>([
    [
      DEFAULT_SESSION_ID,
      createRound(Q01_GALLERY_SHADOW, { sessionId: DEFAULT_SESSION_ID, source: "simulation" }),
    ],
  ]);

  return {
    snapshot(sessionId) {
      const state = rounds.get(sessionId);
      return state
        ? { ...toRoundSnapshot(state, now()), chosenVerdictId: state.solvedBy }
        : undefined;
    },

    command(sessionId, text) {
      const state = rounds.get(sessionId);
      if (!state) return unknownSession();
      const transition = applyCommand(state, text, now());
      rounds.set(sessionId, transition.state);
      return toResult(transition.state, state.revision, transition.result);
    },

    control(sessionId, action) {
      const state = rounds.get(sessionId);
      if (!state) return unknownSession();

      if (action === "restart") {
        const next = restartRound(state);
        rounds.set(sessionId, next);
        return toResult(next, state.revision, {
          code: "ACCEPTED_NEW",
          reason: null,
          message: "Round restarted.",
          missing: [],
          revision: next.revision,
        });
      }

      const paused = action === "pause";
      if (state.paused === paused) {
        return {
          result: {
            code: "ACCEPTED_ALREADY_KNOWN",
            reason: null,
            message: paused ? "Already paused." : "Already running.",
            missing: [],
            revision: state.revision,
          },
          changed: false,
        };
      }
      const next = setPaused(state, paused, now());
      rounds.set(sessionId, next);
      return toResult(next, state.revision, {
        code: "ACCEPTED_NEW",
        reason: null,
        message: paused ? "Round paused." : "Round resumed.",
        missing: [],
        revision: next.revision,
      });
    },
  };
}

// Fixed-window limiter keyed by socket. Date.now is read here, in the server layer,
// because the engine itself must stay free of wall-clock time.
export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return {
    take(key: string): boolean {
      const at = now();
      const recent = (hits.get(key) ?? []).filter((time) => at - time < windowMs);
      const allowed = recent.length < max;
      if (allowed) recent.push(at);
      hits.set(key, recent);
      return allowed;
    },
    forget(key: string): void {
      hits.delete(key);
    },
  };
}
