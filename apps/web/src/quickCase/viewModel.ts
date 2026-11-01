// Viewer-safe view model for the Quick Case overlay. It holds only what viewers may
// see: labels, teasers, and observations unlocked by accepted actions. It never holds
// answers, proof requirements, or explanations. Those stay in packages/cases and the
// server-side engine, and must stay out of the public web bundle.
import type { RoundSnapshot } from "@cluenite/contracts";

export type QuickStage = "observe" | "connect" | "challenge" | "reveal";
export type ClueStatus = "locked" | "unlocked" | "linked";

export interface QuickClue {
  id: string;
  label: string;
  teaser: string;
  observation: string | null;
  status: ClueStatus;
}

export interface QuickVerdict {
  id: string;
  label: string;
}

export interface QuickEvidence {
  id: string;
  label: string;
  team: "A" | "B" | null;
  shared: boolean;
}

// Elapsed time as the server reported it, plus the local moment it arrived. While the
// timer runs, the page adds local time to elapsedMs, so no clock sync with the server is needed.
export interface QuickTimer {
  elapsedMs: number;
  running: boolean;
  receivedAt: number;
}

export interface QuickCaseView {
  source: "simulation" | "live";
  title: string;
  premise: string;
  question: string;
  stage: QuickStage;
  paused: boolean;
  timer: QuickTimer;
  clues: QuickClue[];
  evidence: QuickEvidence[];
  availableActions: string[];
  verdicts: QuickVerdict[];
  // The verdict the server accepted, from the snapshot. Only the reveal stage shows it.
  chosenVerdictId: string | null;
  revealText: string | null;
  // The latest hint the server revealed (null until someone asks for one), and how many were used.
  currentHint: string | null;
  hintLevel: number;
}

export const PREVIEW_OBSERVATION =
  "Placeholder observation. Real text comes from the case engine after an accepted inspect.";
export const PREVIEW_REVEAL =
  "Placeholder reveal. Real text comes from the case engine after a server-verified proof.";
export const PREVIEW_HINT =
  "Placeholder hint. Real hints are authored in the case and revealed by the server.";

// Maps a server snapshot to the overlay view. The server already strips answers and
// proof data from the snapshot, so this is a plain copy.
export function quickCaseFromSnapshot(
  snapshot: RoundSnapshot,
  receivedAt: number = Date.now(),
): QuickCaseView {
  return {
    source: snapshot.source,
    title: snapshot.title,
    premise: snapshot.premise,
    question: snapshot.question,
    stage: snapshot.stage,
    paused: snapshot.paused,
    timer: {
      elapsedMs: snapshot.timer.elapsedMs,
      running: snapshot.timer.running,
      receivedAt,
    },
    clues: snapshot.clues.map((clue) => ({
      id: clue.id,
      label: clue.label,
      teaser: clue.teaser,
      observation: clue.observation,
      status: clue.status,
    })),
    evidence: snapshot.evidence.map((item) => ({
      id: item.id,
      label: item.label,
      team: item.team,
      shared: item.shared,
    })),
    availableActions: snapshot.availableActions,
    verdicts: snapshot.verdicts.map((verdict) => ({
      id: verdict.id,
      label: verdict.label,
    })),
    chosenVerdictId: snapshot.chosenVerdictId ?? null,
    revealText: snapshot.revealText,
    currentHint: snapshot.currentHint,
    hintLevel: snapshot.hintLevel,
  };
}

// Milliseconds shown on the timer at `now`. Stopped timers show the banked value only.
export function timerMsAt(timer: QuickTimer, now: number): number {
  const live = timer.running ? Math.max(0, now - timer.receivedAt) : 0;
  return timer.elapsedMs + live;
}

// m:ss below one hour, h:mm:ss from one hour up. Whole seconds only, rounded down.
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

export function createPreviewQuickCase(): QuickCaseView {
  return {
    source: "simulation",
    title: "The Gallery Shadow",
    premise:
      "A gallery alarm triggered at 21:10. The access log says the main door stayed locked. A moving low shadow is visible.",
    question: "What triggered the alarm?",
    stage: "observe",
    paused: false,
    timer: { elapsedMs: 0, running: false, receivedAt: 0 },
    clues: [
      {
        id: "CAM",
        label: "Camera still, 21:10",
        teaser: "Inspect to view the 21:10 still.",
        observation: null,
        status: "locked",
      },
      {
        id: "ACCESS",
        label: "Door log",
        teaser: "What does the access record show?",
        observation: null,
        status: "locked",
      },
      {
        id: "SCHEDULE",
        label: "Maintenance schedule",
        teaser: "Who was assigned to this gallery?",
        observation: null,
        status: "locked",
      },
    ],
    evidence: [],
    availableActions: ["look", "link", "hint", "solve"],
    verdicts: [
      { id: "ROBOT", label: "The cleaning robot R-07" },
      { id: "THIEF", label: "An intruder" },
    ],
    chosenVerdictId: null,
    revealText: null,
    currentHint: null,
    hintLevel: 0,
  };
}
