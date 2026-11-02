// "A Missing Manuscript": the public sample case. It runs entirely in this browser and is never sent to the
// server or the round engine. It is an original case that shares no clue, evidence, or answer with Q01, M01,
// or C01, so the answer shipped in this bundle spoils no live round. Live cases keep their answers on the server.
//
// The case plays in two halves. First a hidden-object search of the study: twelve things to find, six of which
// are clues that put records on the board. Then the analysis: link records, order the evening, break the claims,
// and name the culprit. Coordinates are in the scene's 1600 x 900 design space (see scene/studyLayout.ts).

export type ClueId = "WINDOW" | "NOTE" | "BOX" | "CLOCK" | "REGISTER" | "GUESTBOOK";
export type FindId =
  | "LATCH"
  | "NOTE"
  | "BOX"
  | "CLOCK"
  | "REGISTER"
  | "GUESTBOOK"
  | "GLOVES"
  | "UMBRELLA"
  | "TEACUP"
  | "QUILL"
  | "KNIGHT"
  | "MAGNIFIER";
export type EvidenceId =
  | "MUD_PRINT"
  | "ROUND_CHALK"
  | "OXBLOOD_NOTE"
  | "BOX_UNFORCED"
  | "CLOCK_STOP"
  | "KEY_OUT"
  | "TORN_PAGE"
  | "PEN_LEFT"
  | "AT_DINNER";
export type LinkId = "L_ROUND" | "L_PAPER" | "L_PEN" | "L_BOXKEY" | "L_KEY";
export type EventId = "ROUND" | "PEN" | "DINNER" | "KEY" | "LIFT" | "ALARM";
export type ClaimId = "INTRUDER" | "RIVAL" | "LOCKED";
export type SuspectId = "GARDENER" | "GUEST" | "CLERK";

export interface SampleClue {
  id: ClueId;
  label: string;
  place: string;
  observation: string;
  releases: readonly EvidenceId[];
  /** Where the detective stands to examine it, on the floor line. */
  standX: number;
}

export interface FindItem {
  id: FindId;
  label: string;
  /** The clue this object is, or null for an ordinary object that only goes in the notebook. */
  clue: ClueId | null;
  note: string;
  /** Hit box: centre and full size in design units. */
  box: { x: number; y: number; w: number; h: number };
  /** Portable objects are collected and leave the room when found. */
  portable: boolean;
}

export interface SampleEvidence {
  id: EvidenceId;
  label: string;
  detail: string;
  time: string | null;
  clue: ClueId;
}

export interface SampleLink {
  id: LinkId;
  a: EvidenceId;
  b: EvidenceId;
  title: string;
  text: string;
  /** Required links are part of the proof. The others raise the score. */
  required: boolean;
}

export interface SampleEvent {
  id: EventId;
  label: string;
  time: string;
  /** The event can be placed once this record is released. ALARM is known from the start. */
  needs: EvidenceId | null;
}

export interface SampleClaim {
  id: ClaimId;
  claim: string;
  /** Who says it. The red herrings come from chat; LOCKED is the clerk's own statement. */
  source: "chat" | "CLERK";
  /** The clue whose discovery makes chat raise this claim. LOCKED is open from the start. */
  raisedBy: ClueId | null;
  decisive: EvidenceId;
  contradiction: string;
  /** Evidence that relates to the claim but does not settle it. */
  weak: Partial<Record<EvidenceId, string>>;
  clears: SuspectId | null;
}

export interface SampleSuspect {
  id: SuspectId;
  name: string;
  role: string;
  statement: string;
}

export const CASE_TITLE = "A Missing Manuscript";
export const CASE_PLACE = "Ashgrove House · the study";
export const CASE_PREMISE =
  "Ashgrove House, 21:05. A rare manuscript is gone from the study, and the rain has not stopped since eight. The night clerk raised the alarm.";
export const CASE_QUESTION = "Who took the manuscript, and how?";

/** The opening narration, one line per beat. */
export const OPENING_LINES: readonly string[] = [
  "Ashgrove House, 21:05. Rain since eight.",
  "A rare manuscript is gone from its glass box in the study.",
  "Ada Wren, the night clerk, raised the alarm: “The study was locked all evening. I keep the only key.”",
  "Three people were close enough to take it.",
];

export const SUSPECTS: readonly SampleSuspect[] = [
  {
    id: "GARDENER",
    name: "Tomas Reed",
    role: "Gardener",
    statement: "I latched the windows at half past eight, same as every wet night.",
  },
  {
    id: "GUEST",
    name: "Celeste Varga",
    role: "Rival collector",
    statement: "I came to bid on that manuscript, not to steal it. Ask anyone at dinner.",
  },
  {
    id: "CLERK",
    name: "Ada Wren",
    role: "Night clerk",
    statement: "The study was locked all evening. I keep the only key.",
  },
];

export const CLUES: readonly SampleClue[] = [
  {
    id: "WINDOW",
    label: "Window latch",
    place: "Garden window",
    observation:
      "The latch is shut from inside, with a muddy thumbprint on it. Chalk on the frame reads “Latched 20:30 · T.R.” The inside sill is dry.",
    releases: ["MUD_PRINT", "ROUND_CHALK"],
    standX: 330,
  },
  {
    id: "NOTE",
    label: "Folded note",
    place: "Writing desk",
    observation:
      "“Meet at nine. Bring it.” Unsigned, in oxblood ink, on ruled paper with one torn edge.",
    releases: ["OXBLOOD_NOTE"],
    standX: 880,
  },
  {
    id: "BOX",
    label: "Glass box",
    place: "Mantel",
    observation:
      "Opened with its own key: no scratches, no forced hinge. The only box key hangs on the study key ring.",
    releases: ["BOX_UNFORCED"],
    standX: 1060,
  },
  {
    id: "CLOCK",
    label: "Mantel clock",
    place: "Mantel",
    observation: "The open box lid caught the pendulum. The hands stopped at 20:52.",
    releases: ["CLOCK_STOP"],
    standX: 1190,
  },
  {
    id: "REGISTER",
    label: "Key register",
    place: "Hall desk",
    observation:
      "The study key was signed out at 20:50 and returned at 21:02, initials A.W. The back page has been torn out.",
    releases: ["KEY_OUT", "TORN_PAGE"],
    standX: 1340,
  },
  {
    id: "GUESTBOOK",
    label: "Guest book",
    place: "Hall desk",
    observation:
      "Celeste Varga signed in at 20:35 and left her oxblood pen beside the register. The seating plan puts her at dinner from 20:40 to 21:10, next to the host.",
    releases: ["PEN_LEFT", "AT_DINNER"],
    standX: 1340,
  },
];

/** The search list, in the order the find bar shows it. */
export const FIND_ITEMS: readonly FindItem[] = [
  { id: "LATCH", label: "Window latch", clue: "WINDOW", note: "", box: { x: 200, y: 418, w: 40, h: 36 }, portable: false },
  { id: "NOTE", label: "Folded note", clue: "NOTE", note: "", box: { x: 790, y: 593, w: 50, h: 26 }, portable: true },
  { id: "BOX", label: "Glass box", clue: "BOX", note: "", box: { x: 1092, y: 382, w: 84, h: 72 }, portable: false },
  { id: "CLOCK", label: "Mantel clock", clue: "CLOCK", note: "", box: { x: 1250, y: 368, w: 72, h: 96 }, portable: false },
  { id: "REGISTER", label: "Key register", clue: "REGISTER", note: "", box: { x: 1492, y: 527, w: 56, h: 24 }, portable: false },
  { id: "GUESTBOOK", label: "Guest book", clue: "GUESTBOOK", note: "", box: { x: 1553, y: 524, w: 46, h: 22 }, portable: false },
  {
    id: "GLOVES",
    label: "Muddy gloves",
    clue: null,
    note: "Tomas’s gardening gloves, caked with mud from the rain round.",
    box: { x: 372, y: 776, w: 78, h: 34 },
    portable: true,
  },
  {
    id: "UMBRELLA",
    label: "Umbrella",
    clue: null,
    note: "Still dripping against the desk. Somebody came in from the garden tonight.",
    box: { x: 538, y: 690, w: 40, h: 156 },
    portable: true,
  },
  {
    id: "TEACUP",
    label: "Teacup",
    clue: null,
    note: "Cold tea, half drunk. Someone sat at this desk after dinner began.",
    box: { x: 736, y: 584, w: 42, h: 24 },
    portable: true,
  },
  {
    id: "QUILL",
    label: "Quill",
    clue: null,
    note: "The desk quill is dry, and the desk ink is black. The oxblood note was not written here.",
    box: { x: 858, y: 562, w: 28, h: 48 },
    portable: true,
  },
  {
    id: "KNIGHT",
    label: "Chess knight",
    clue: null,
    note: "A chess knight wedged among the books. The set in the hall is one piece short.",
    box: { x: 632, y: 277, w: 24, h: 34 },
    portable: true,
  },
  {
    id: "MAGNIFIER",
    label: "Reading glass",
    clue: null,
    note: "The host’s reading glass, left on the sill.",
    box: { x: 268, y: 584, w: 48, h: 18 },
    portable: true,
  },
];

/** The call-out grid laid over the scene for chat and the keyboard: columns A to J, rows 1 to 6. */
export const GRID_COLS = 10;
export const GRID_ROWS = 6;
export const GRID_CELL_W = 160;
export const GRID_CELL_H = 150;
export const GRID_LETTERS = "ABCDEFGHIJ";

export const EVIDENCE: readonly SampleEvidence[] = [
  {
    id: "MUD_PRINT",
    label: "Muddy thumbprint on the latch",
    detail: "Garden mud, pressed on the inside of the latch.",
    time: null,
    clue: "WINDOW",
  },
  {
    id: "ROUND_CHALK",
    label: "Window latched at 20:30",
    detail: "Chalk: “Latched 20:30 · T.R.” The inside sill is dry.",
    time: "20:30",
    clue: "WINDOW",
  },
  {
    id: "OXBLOOD_NOTE",
    label: "“Meet at nine” note",
    detail: "Oxblood ink on ruled paper, torn along one edge. Unsigned.",
    time: null,
    clue: "NOTE",
  },
  {
    id: "BOX_UNFORCED",
    label: "Box opened with its key",
    detail: "No forcing marks. The box key hangs on the study key ring.",
    time: null,
    clue: "BOX",
  },
  {
    id: "CLOCK_STOP",
    label: "Clock stopped at 20:52",
    detail: "The open box lid caught the pendulum.",
    time: "20:52",
    clue: "CLOCK",
  },
  {
    id: "KEY_OUT",
    label: "Study key out 20:50–21:02",
    detail: "Signed out and returned in the initials A.W.",
    time: "20:50",
    clue: "REGISTER",
  },
  {
    id: "TORN_PAGE",
    label: "Back page torn from the register",
    detail: "Ruled ledger paper, torn along the binding.",
    time: null,
    clue: "REGISTER",
  },
  {
    id: "PEN_LEFT",
    label: "Celeste’s pen left at the hall desk",
    detail: "Oxblood ink. Left beside the key register at 20:35.",
    time: "20:35",
    clue: "GUESTBOOK",
  },
  {
    id: "AT_DINNER",
    label: "Celeste at dinner 20:40–21:10",
    detail: "Seated next to the host. Every guest saw her there.",
    time: "20:40",
    clue: "GUESTBOOK",
  },
];

export const LINKS: readonly SampleLink[] = [
  {
    id: "L_ROUND",
    a: "MUD_PRINT",
    b: "ROUND_CHALK",
    title: "The mud is from the 20:30 round",
    text: "Tomas latched the window from inside at 20:30. The print is his, and the dry sill says the window stayed shut.",
    required: false,
  },
  {
    id: "L_PAPER",
    a: "OXBLOOD_NOTE",
    b: "TORN_PAGE",
    title: "The note is the missing register page",
    text: "“Meet at nine” is written on the page torn from the key register. It was written at the hall desk.",
    required: false,
  },
  {
    id: "L_PEN",
    a: "OXBLOOD_NOTE",
    b: "PEN_LEFT",
    title: "Celeste’s ink, not Celeste’s hand",
    text: "Her pen sat at the hall desk from 20:35. Anyone at that desk could write in her ink.",
    required: false,
  },
  {
    id: "L_BOXKEY",
    a: "BOX_UNFORCED",
    b: "KEY_OUT",
    title: "Opened with the study key",
    text: "The box key is on the study key ring, and the ring was signed out to A.W.",
    required: false,
  },
  {
    id: "L_KEY",
    a: "KEY_OUT",
    b: "CLOCK_STOP",
    title: "The box opened while the key was out",
    text: "The clock stopped at 20:52, inside the 20:50–21:02 window when A.W. held the study key.",
    required: true,
  },
];

export const EVENTS: readonly SampleEvent[] = [
  { id: "ROUND", label: "Window latched on the rain round", time: "20:30", needs: "ROUND_CHALK" },
  { id: "PEN", label: "Celeste’s pen left at the hall desk", time: "20:35", needs: "PEN_LEFT" },
  { id: "DINNER", label: "Dinner begins with Celeste seated", time: "20:40", needs: "AT_DINNER" },
  { id: "KEY", label: "Study key signed out", time: "20:50", needs: "KEY_OUT" },
  { id: "LIFT", label: "The manuscript box is opened", time: "20:52", needs: "CLOCK_STOP" },
  { id: "ALARM", label: "The alarm is raised", time: "21:05", needs: null },
];

/** The order the timeline accepts. The sample is local, so the answer lives in this bundle by design. */
export const TIMELINE_ORDER: readonly EventId[] = ["ROUND", "PEN", "DINNER", "KEY", "LIFT", "ALARM"];

/** The order cards are first dealt in, so the puzzle never starts solved. */
export const TIMELINE_DEAL: readonly EventId[] = ["ALARM", "LIFT", "ROUND", "KEY", "DINNER", "PEN"];

export const TIMELINE_RESULT =
  "The window was latched before dinner, and Celeste was at the table when the box opened. The only key was out of the register.";

export const CLAIMS: readonly SampleClaim[] = [
  {
    id: "INTRUDER",
    claim: "Tomas came in through the garden window.",
    source: "chat",
    raisedBy: "WINDOW",
    decisive: "ROUND_CHALK",
    contradiction:
      "The window was latched from inside at 20:30 and the sill is dry. Nobody came through it in the rain.",
    weak: {
      MUD_PRINT: "Mud on the latch fits his window round. It does not put him in the study later.",
    },
    clears: "GARDENER",
  },
  {
    id: "RIVAL",
    claim: "Celeste wrote the note and took the manuscript at nine.",
    source: "chat",
    raisedBy: "NOTE",
    decisive: "AT_DINNER",
    contradiction: "Celeste sat at dinner from 20:40 to 21:10. The box opened at 20:52.",
    weak: {
      OXBLOOD_NOTE: "Her ink is on the note, but ink can be borrowed.",
      PEN_LEFT: "Her pen was at the hall desk all evening. That shows who could use her ink, not who did.",
    },
    clears: "GUEST",
  },
  {
    id: "LOCKED",
    claim: "The study was locked all evening.",
    source: "CLERK",
    raisedBy: null,
    decisive: "KEY_OUT",
    contradiction: "The register shows the study key out from 20:50 to 21:02, in Ada Wren’s initials.",
    weak: {
      CLOCK_STOP: "The clock shows when the box opened, not whether the door was locked.",
      BOX_UNFORCED: "An unforced box means a key was used. It does not say which door was open.",
    },
    clears: null,
  },
];

/** Analysis hints, used once the search is over. During the search a hint points at an object instead. */
export const HINTS: readonly string[] = [
  "Ada says the study was locked all evening. The key register would know.",
  "Put the evening in order. Where was everyone when the box opened?",
  "Link the moment the clock stopped to the key register, then challenge Ada’s statement with the register.",
];

export const CULPRIT: SuspectId = "CLERK";

export const REVEAL_TITLE = "The alarm was her alibi.";
export const REVEAL_BODY =
  "Ada Wren signed out the study key at 20:50 and opened the manuscript box at 20:52; the lid caught the clock’s pendulum. She tore the back page from her own register and wrote “Meet at nine. Bring it.” with the pen Celeste had left at the hall desk. At 21:05 she raised the alarm and told the house the study had been locked all evening.";
export const REVEAL_TWIST = "The manuscript was sewn into the lining of her coat.";

export type ReconstructionBeat = "window" | "pen" | "key" | "box" | "note" | "alarm";

/** Reconstruction beats for the ending. The scene plays one beat per line. */
export const RECONSTRUCTION: readonly { time: string; text: string; beat: ReconstructionBeat }[] = [
  { time: "20:30", text: "Tomas latches the garden window on his rain round.", beat: "window" },
  { time: "20:35", text: "Celeste signs the guest book and leaves her pen at the hall desk.", beat: "pen" },
  { time: "20:50", text: "Ada signs the study key out of her own register.", beat: "key" },
  { time: "20:52", text: "She opens the box. The lid stops the clock.", beat: "box" },
  { time: "20:58", text: "She writes the note on the torn register page, in Celeste’s ink.", beat: "note" },
  { time: "21:05", text: "She raises the alarm: “The study was locked all evening.”", beat: "alarm" },
];

/** Points. The search pays per find, with combos for quick finds and a time bonus when the list is done. */
export const POINTS = {
  item: 150,
  comboStep: 50,
  comboCap: 4,
  comboWindowMs: 4000,
  timeBonusMax: 1500,
  timeBonusPerSecond: 10,
  requiredLink: 600,
  optionalLink: 300,
  timeline: 800,
  claim: 400,
  verdict: 1000,
  /** A find made by following a viewer's grid call. */
  crewCall: 50,
  /** Co-op: a record sent to Station B because it asked for it, and the extra for answering quickly. */
  handoff: 150,
  quickHandoff: 100,
  quickHandoffMs: 20000,
} as const;

/** Deductions. Wrong links and weak challenges are capped so experiments stay cheap. */
export const PENALTY = {
  misclick: 40,
  /** Four misclicks inside this window steady the hand for STEADY_MS: clicks are ignored for a moment. */
  shakyWindowMs: 3000,
  shakyCount: 4,
  steadyMs: 2000,
  searchHint: 150,
  searchHintCooldownMs: 15000,
  hint: 300,
  wrongLink: 100,
  wrongLinkCap: 500,
  wrongOrder: 150,
  weakChallenge: 100,
  weakChallengeCap: 400,
  wrongVerdict: 800,
} as const;

/** Final ratings, highest first. Seals are the case file's wax seals, one to three. */
export const RATINGS: readonly { min: number; seals: number; title: string; note: string }[] = [
  { min: 8000, seals: 3, title: "Master detective", note: "Every thread pulled, and the room never fooled you." },
  { min: 6000, seals: 2, title: "Sharp eye", note: "A clean case with only a loose thread or two." },
  { min: 3500, seals: 1, title: "Steady hand", note: "You got there. The ending reads better with fewer missteps." },
  { min: 0, seals: 0, title: "Case closed", note: "Solved, but the house nearly talked you out of it." },
];

export function clueById(id: ClueId): SampleClue {
  const clue = CLUES.find((item) => item.id === id);
  if (!clue) throw new Error(`Unknown clue ${id}`);
  return clue;
}

export function evidenceById(id: EvidenceId): SampleEvidence {
  const item = EVIDENCE.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown evidence ${id}`);
  return item;
}

export function suspectById(id: SuspectId): SampleSuspect {
  const suspect = SUSPECTS.find((entry) => entry.id === id);
  if (!suspect) throw new Error(`Unknown suspect ${id}`);
  return suspect;
}

export function findItemById(id: FindId): FindItem {
  const item = FIND_ITEMS.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return item;
}

/** The grid cell that holds a design-space point, for example "D3". */
export function cellAt(x: number, y: number): string {
  const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(x / GRID_CELL_W)));
  const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(y / GRID_CELL_H)));
  return `${GRID_LETTERS[col] ?? "A"}${row + 1}`;
}
