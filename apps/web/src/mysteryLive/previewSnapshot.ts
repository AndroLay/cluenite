import type { RoundSnapshot } from "@cluenite/contracts";

// A viewer-safe sample of the authored M01 case. It contains only facts that the
// server may already publish; it is always labeled as a simulation in the UI.
export const M01_PREVIEW_SNAPSHOT: RoundSnapshot = {
  protocolVersion: 1,
  revision: 3,
  sessionId: "preview-m01",
  source: "simulation",
  caseId: "M01_MISSING_TROPHY",
  caseMode: "mystery",
  team: null,
  title: "The Missing Festival Trophy",
  premise:
    "The trophy was visible at 18:47 and missing at 19:02, just after a blackout.",
  question: "Was it stolen, or was it moved for another reason?",
  phase: "ACTIVE",
  stage: "connect",
  paused: false,
  timer: { elapsedMs: 82_000, running: false },
  clues: [
    {
      id: "PHOTO",
      label: "18:47 gallery photo",
      teaser: "The trophy before the blackout",
      status: "unlocked",
      observation: "The trophy is still in its case at 18:47.",
    },
    {
      id: "CASE",
      label: "Display case warning",
      teaser: "A temperature warning before the incident",
      status: "unlocked",
      observation:
        "The display reported overheating at 18:56, three minutes before the blackout.",
    },
    {
      id: "ACCESS",
      label: "Maintenance access log",
      teaser: "An access record from before the blackout",
      status: "locked",
      observation: null,
    },
    {
      id: "TROLLEY",
      label: "Trolley route card",
      teaser: "A covered trolley route through the gallery",
      status: "locked",
      observation: null,
    },
    {
      id: "WORK_ORDER",
      label: "Signed safety work order",
      teaser: "A signed order connected to the display case",
      status: "locked",
      observation: null,
    },
  ],
  evidence: [
    {
      id: "PHOTO_1847",
      label: "Trophy visible at 18:47",
      team: null,
      shared: false,
    },
    {
      id: "HEAT_WARNING",
      label: "Overheating warning at 18:56",
      team: null,
      shared: false,
    },
    {
      id: "DISPLAY_EMPTY",
      label: "Display empty at discovery",
      team: null,
      shared: false,
    },
  ],
  sequences: [
    {
      id: "MISSING_TROPHY_TIMELINE",
      label: "Incident timeline",
      complete: false,
      events: [
        { id: "BLACKOUT", label: "Gallery blackout" },
        { id: "TROLLEY", label: "Covered trolley leaves the gallery" },
        { id: "OPEN", label: "Display case opened" },
        { id: "ORDER", label: "Safety work order issued" },
        { id: "HEAT", label: "Display temperature warning" },
      ],
    },
  ],
  theories: [
    {
      id: "BLACKOUT_THEFT",
      label: "The trophy was stolen during the blackout",
      status: "UNVERIFIED",
    },
  ],
  currentHint: null,
  hintLevel: 0,
  availableActions: ["look", "order", "theory", "challenge", "solve", "hint"],
  verdicts: [
    { id: "SAFETY_MOVE", label: "Authorized safety relocation to B4" },
    { id: "THEFT", label: "The trophy was stolen" },
  ],
  chosenVerdictId: null,
  revealText: null,
};
