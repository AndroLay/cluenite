// Board cases: short practice cases played on a pinboard instead of a hidden-object room. Chat votes on which card
// to turn next, viewers offer hunches for links, theories carry live polls, and in co-op a second station (a
// scripted partner streamer with their own chat) holds half of the evidence. Both cases are original stories
// written for the browser practice mode; their answers ship in the bundle by design.

import type { ViewerTone } from "./crowd";

export type Station = "A" | "B";
export type CardArtKind =
  | "clasp"
  | "ticket"
  | "watch"
  | "pearl"
  | "cards"
  | "punch"
  | "lamp"
  | "logbook"
  | "boot"
  | "oil"
  | "tide"
  | "radio"
  | "manifest"
  | "boat";
export type Portrait = "hat" | "cap" | "bun" | "beard" | "scarf" | "bob";

export interface BoardCard {
  id: string;
  station: Station;
  /** What the back of the card says before it is turned: where it was found. */
  back: string;
  title: string;
  text: string;
  art: CardArtKind;
}

export interface BoardLink {
  id: string;
  a: string;
  b: string;
  required: boolean;
  title: string;
  text: string;
}

export interface BoardClaim {
  id: string;
  /** "chat" for a chat theory, or the suspect id whose statement it is. */
  source: string;
  text: string;
  /** Card that raises the claim, or null when it stands from the start. */
  raisedBy: string | null;
  decisive: string;
  clears: string | null;
  required: boolean;
  belief: number;
  contradiction: string;
}

export interface BoardSuspect {
  id: string;
  name: string;
  role: string;
  statement: string;
  portrait: Portrait;
}

export interface Hunch {
  viewer: string;
  a: string;
  b: string;
}

export interface PartnerScript {
  name: string;
  station: string;
  hello: string;
  /** When Station B's team turns each of its cards, in ms after the case starts. */
  finds: { card: string; after: number; line: string }[];
  /** What Station B asks this station for, and what it sends back when it gets it. */
  requests: { card: string; after: number; ask: string; reply: string; sends: string[] }[];
  /** Station B's answers when this station asks for one of its cards. */
  digging: string;
  sending: string;
  agree: string;
  disagree: string;
  chat: readonly (readonly [string, string])[];
}

export interface BoardCaseDef {
  id: string;
  mode: "quick" | "coop";
  title: string;
  place: string;
  question: string;
  premise: string;
  opening: readonly string[];
  suspects: readonly BoardSuspect[];
  cards: readonly BoardCard[];
  links: readonly BoardLink[];
  claims: readonly BoardClaim[];
  culprit: string;
  reveal: { title: string; beats: readonly { time: string; text: string; cards: readonly string[] }[]; twist: string };
  crowd: Record<string, readonly (readonly [string, string])[]>;
  hunches: readonly Hunch[];
  partner?: PartnerScript;
  /** Seconds a fast team needs; the time bonus counts down from here. */
  par: number;
  ratings: readonly { min: number; seals: number; title: string }[];
  /** Colour accent for the board, from the Brown Noir palette. */
  accent: string;
  viewerTones?: Record<string, ViewerTone>;
}

// ---------------------------------------------------------------------------------------------------------------
// Quick Case: Pearls on the Night Express

export const EXPRESS: BoardCaseDef = {
  id: "express",
  mode: "quick",
  title: "Pearls on the Night Express",
  place: "The 21:40 Night Express · Compartment 7",
  question: "Who took the Countess’s pearls in the tunnel, and where are they?",
  premise:
    "Ninety seconds of darkness in the Harrow Tunnel. When the lamps came back, the Countess’s pearls were gone, and the door was still latched from the inside.",
  opening: [
    "21:42. The Night Express plunges into the Harrow Tunnel, and every lamp goes out.",
    "Ninety seconds later the light returns. The Countess screams: her pearls are gone.",
    "The door is latched from the inside. Nobody left. So who took them?",
  ],
  suspects: [
    { id: "MAGICIAN", name: "Ivo Marsh", role: "Stage magician", portrait: "hat", statement: "I sat by the window the whole time. I perform in the light, not the dark." },
    { id: "NIECE", name: "Lina Hart", role: "The Countess’s niece", portrait: "bun", statement: "I slept through all of it. I always sleep on trains." },
    { id: "CONDUCTOR", name: "Mr. Pell", role: "Conductor", portrait: "cap", statement: "I was punching tickets in carriage six when the lamps went out." },
  ],
  cards: [
    { id: "CLASP", station: "A", back: "On the Countess’s collar", title: "Cut clasp", art: "clasp", text: "The silk string was cut clean, not snapped. A small, sharp blade did it." },
    { id: "TICKET", station: "A", back: "In Lina’s coat pocket", title: "Punched ticket", art: "ticket", text: "Lina’s ticket carries tonight’s punch mark: 21:43. That is inside the blackout." },
    { id: "WATCH", station: "A", back: "On the floor", title: "Stopped watch", art: "watch", text: "The Countess’s watch hit the floor and stopped at 21:42, as the lamps died." },
    { id: "PEARL", station: "A", back: "Under the seat by the door", title: "One loose pearl", art: "pearl", text: "A single pearl under the seat by the door, far from the window seat." },
    { id: "DECK", station: "A", back: "On the window table", title: "Magician’s deck", art: "cards", text: "Fifty-two cards, all there, still warm from a shuffle. He was practising at the window." },
    { id: "PUNCH", station: "A", back: "On the conductor’s belt", title: "Ticket punch", art: "punch", text: "A brass punch with a little blade for cutting tags. The hollow handle rattles." },
  ],
  links: [
    { id: "L_HERE", a: "TICKET", b: "WATCH", required: true, title: "The conductor was here", text: "A ticket was punched in this compartment at 21:43, in the dark. Mr. Pell was not in carriage six." },
    { id: "L_BLADE", a: "CLASP", b: "PUNCH", required: false, title: "The punch’s blade", text: "The clean cut matches the little blade on the ticket punch." },
    { id: "L_DOOR", a: "PEARL", b: "CLASP", required: false, title: "Cut at the door", text: "The string was cut and a pearl slipped by the door: the thief stood at the door, not the window." },
  ],
  claims: [
    { id: "TRICK", source: "chat", raisedBy: null, required: false, belief: 64, decisive: "PEARL", clears: "MAGICIAN", text: "It’s the magician. Sleight of hand in the dark!", contradiction: "The pearl fell by the door. The magician never left the window seat." },
    { id: "CARRIAGE", source: "CONDUCTOR", raisedBy: null, required: true, belief: 72, decisive: "TICKET", clears: null, text: "I was in carriage six when the lamps went out.", contradiction: "Lina’s ticket was punched here at 21:43, in the dark. Only the conductor punches tickets." },
    { id: "HEIR", source: "chat", raisedBy: "CLASP", required: false, belief: 45, decisive: "PUNCH", clears: "NIECE", text: "Lina inherits everything. It’s her!", contradiction: "Only the punch’s blade made that cut, and the punch never left Mr. Pell’s belt." },
  ],
  culprit: "CONDUCTOR",
  reveal: {
    title: "The conductor never left.",
    beats: [
      { time: "21:40", text: "Mr. Pell checks Compartment 7 and latches the door behind him.", cards: [] },
      { time: "21:42", text: "The tunnel. In the dark he cuts the string with the punch’s blade, and the watch falls.", cards: ["CLASP", "WATCH"] },
      { time: "21:42", text: "One pearl skips away under the seat by the door.", cards: ["PEARL"] },
      { time: "21:43", text: "To look busy, he punches Lina’s ticket in the dark, and the punch stamps the time.", cards: ["TICKET"] },
      { time: "21:44", text: "The lamps return. The pearls rattle in the hollow handle on his belt.", cards: ["PUNCH"] },
    ],
    twist: "The pearls were in the ticket punch all along.",
  },
  crowd: {
    start: [
      ["marlowe_fan", "a locked compartment?? classic"],
      ["inkwell_ivy", "the magician. obviously the magician"],
    ],
    "card:CLASP": [["ledger_lou", "clean cut, so a blade"]],
    "card:TICKET": [["tick_tock_tess", "21:43?? the lights were out"]],
    "card:WATCH": [["tick_tock_tess", "21:42 on the watch. one minute apart"]],
    "card:PEARL": [["mudlark", "by the DOOR, not the window"]],
    "card:DECK": [["velvet_glove", "all 52 cards. he was practising"]],
    "card:PUNCH": [["ledger_lou", "hollow handle... that rattles..."]],
    "link:L_HERE": [
      ["velvet_glove", "so Pell WAS here"],
      ["mudlark", "carriage six my foot"],
    ],
    "link:L_BLADE": [["ledger_lou", "the punch has a blade. ok."]],
    "claim:TRICK": [["inkwell_ivy", "fine, not the magician"]],
    "claim:CARRIAGE": [["ledger_lou", "he lied about carriage six"]],
    "claim:HEIR": [["velvet_glove", "Lina is clear"]],
    wrong: [["tick_tock_tess", "the proof says no"]],
    solved: [
      ["mudlark", "THE PUNCH"],
      ["velvet_glove", "pearls in the handle!!"],
    ],
  },
  hunches: [
    { viewer: "tick_tock_tess", a: "TICKET", b: "WATCH" },
    { viewer: "mudlark", a: "DECK", b: "CLASP" },
    { viewer: "ledger_lou", a: "CLASP", b: "PUNCH" },
    { viewer: "velvet_glove", a: "PEARL", b: "CLASP" },
  ],
  par: 150,
  ratings: [
    { min: 3800, seals: 3, title: "Master detective" },
    { min: 2800, seals: 2, title: "Sharp eye" },
    { min: 1800, seals: 1, title: "Steady hand" },
    { min: 0, seals: 0, title: "Case closed" },
  ],
  accent: "#d9b681",
};

// ---------------------------------------------------------------------------------------------------------------
// Co-op: The Lighthouse Went Dark

export const LIGHTHOUSE: BoardCaseDef = {
  id: "lighthouse",
  mode: "coop",
  title: "The Lighthouse Went Dark",
  place: "Greyhaven Point · Station A: the lighthouse · Station B: the harbour office",
  question: "Who put out the light, and what really happened to the strongbox?",
  premise:
    "At 23:10 the Greyhaven light went dark for six minutes. The cargo ship Marigold struck the Teeth, and her strongbox was lost. You hold the lighthouse; Harbourmaster Ines Vale holds the harbour office. Neither room tells the whole story.",
  opening: [
    "23:10. The Greyhaven light goes dark.",
    "Six minutes later the Marigold is on the Teeth, and her strongbox is gone.",
    "Two stations, two chats, one case. You take the lighthouse. Ines takes the harbour office.",
  ],
  suspects: [
    { id: "KEEPER", name: "Old Bram", role: "Lighthouse keeper", portrait: "beard", statement: "I trimmed that wick myself at dusk. I’d never let my light die." },
    { id: "CAPTAIN", name: "Captain Rook", role: "Master of the Marigold", portrait: "cap", statement: "The light failed without warning. We never saw the Teeth coming." },
    { id: "CLERK", name: "Della Moss", role: "Harbour clerk", portrait: "bob", statement: "I was at my desk all night. Ask the radio log." },
  ],
  cards: [
    { id: "WICK", station: "A", back: "The lamp", title: "Short wick", art: "lamp", text: "The wick was trimmed far too short. It would burn out at about 23:10." },
    { id: "LOG", station: "A", back: "The keeper’s desk", title: "Keeper’s log", art: "logbook", text: "“21:30. Visitor: Capt. Rook, to see the lens.” In Bram’s hand." },
    { id: "BOOT", station: "A", back: "The stairs", title: "Salt boot print", art: "boot", text: "A salt-stiff sea boot print, size 11, going up the stairs. Bram wears size 8." },
    { id: "OIL", station: "A", back: "The oil store", title: "Full oil tins", art: "oil", text: "Every tin is full. The light did not run dry; it was made to fail." },
    { id: "TIDE", station: "B", back: "The tide board", title: "Tide table", art: "tide", text: "Tonight the Teeth stood out of the water from 23:00 to 23:20 only." },
    { id: "RADIO", station: "B", back: "The radio desk", title: "Radio log", art: "radio", text: "23:02, Marigold: “Light is fine, holding course.” Logged by Della at the harbour desk." },
    { id: "MANIFEST", station: "B", back: "The cargo files", title: "Marigold manifest", art: "manifest", text: "Strongbox insured for 10,000. Weight at loading: 4 kg. Empty." },
    { id: "BOAT", station: "B", back: "The rescue log", title: "Lifeboat entry", art: "boat", text: "The Marigold’s lifeboat was lowered at 23:05, five minutes before the dark." },
  ],
  links: [
    { id: "L_TIMED", a: "WICK", b: "TIDE", required: true, title: "Timed for the Teeth", text: "The wick was cut to fail exactly while the Teeth stood out of the water. The dark was planned." },
    { id: "L_COURSE", a: "LOG", b: "RADIO", required: true, title: "Rook knew", text: "Rook stood at the lamp at 21:30, then radioed “holding course” toward the Teeth. He knew when it would go dark." },
    { id: "L_EMPTY", a: "MANIFEST", b: "BOAT", required: false, title: "Nothing to lose", text: "A 4 kg strongbox and a lifeboat lowered early: the loss was staged." },
    { id: "L_BOOTS", a: "BOOT", b: "LOG", required: false, title: "Not Bram’s boots", text: "Size 11 sea boots on the stairs after Rook’s visit. Bram wears 8." },
  ],
  claims: [
    { id: "ASLEEP", source: "chat", raisedBy: null, required: false, belief: 66, decisive: "WICK", clears: "KEEPER", text: "Old Bram fell asleep and let the light die.", contradiction: "A sleeping keeper does not cut a wick to fail at 23:10. The light was sabotaged." },
    { id: "WARNING", source: "CAPTAIN", raisedBy: null, required: true, belief: 70, decisive: "BOAT", clears: null, text: "The light failed without warning. We never saw the Teeth coming.", contradiction: "His lifeboat went down at 23:05, five minutes before the dark. He knew." },
    { id: "KEY", source: "chat", raisedBy: "OIL", required: false, belief: 41, decisive: "RADIO", clears: "CLERK", text: "Della has a lighthouse key. She put the light out!", contradiction: "Della logged the Marigold’s call at 23:02 at the harbour desk, two miles from the lamp." },
  ],
  culprit: "CAPTAIN",
  reveal: {
    title: "The captain wrecked his own ship.",
    beats: [
      { time: "Morning", text: "The Marigold’s strongbox goes aboard: 4 kg, empty, insured for 10,000.", cards: ["MANIFEST"] },
      { time: "21:30", text: "Captain Rook climbs the lighthouse “to see the lens” and trims the wick to die at 23:10.", cards: ["LOG", "WICK", "BOOT"] },
      { time: "23:02", text: "He radios “light is fine, holding course,” steering for the Teeth at low tide.", cards: ["RADIO", "TIDE"] },
      { time: "23:05", text: "His lifeboat goes down, five minutes early.", cards: ["BOAT"] },
      { time: "23:10", text: "The light dies on schedule. The Marigold strikes the Teeth, and the empty box becomes a claim.", cards: ["WICK"] },
    ],
    twist: "There was never anything in the strongbox.",
  },
  crowd: {
    start: [
      ["inkwell_ivy", "old Bram fell asleep, calling it now"],
      ["marlowe_fan", "a dark lighthouse on the night of a wreck. not an accident"],
    ],
    "card:WICK": [["ledger_lou", "that wick was CUT"]],
    "card:LOG": [["tick_tock_tess", "Rook was up there at 21:30??"]],
    "card:BOOT": [["mudlark", "size 11. Bram is tiny"]],
    "card:OIL": [["velvet_glove", "full tins. it didn’t run dry"]],
    "card:TIDE": [["ledger_lou", "the Teeth were only dry 23:00 to 23:20"]],
    "card:RADIO": [["tick_tock_tess", "“light is fine” at 23:02... sus"]],
    "card:MANIFEST": [["velvet_glove", "a 4 kg strongbox lol"]],
    "card:BOAT": [["mudlark", "lifeboat at 23:05, BEFORE the dark"]],
    "link:L_TIMED": [["tick_tock_tess", "timed to the tide. planned."]],
    "link:L_COURSE": [["marlowe_fan", "Rook knew exactly when"]],
    "claim:ASLEEP": [["inkwell_ivy", "sorry Bram"]],
    "claim:WARNING": [["ledger_lou", "no warning? the lifeboat says otherwise"]],
    "claim:KEY": [["velvet_glove", "Della was at her desk"]],
    wrong: [["tick_tock_tess", "both stations have to agree, and they don’t"]],
    solved: [
      ["mudlark", "INSURANCE FRAUD"],
      ["velvet_glove", "an empty box all along!!"],
    ],
  },
  hunches: [
    { viewer: "tick_tock_tess", a: "WICK", b: "TIDE" },
    { viewer: "mudlark", a: "OIL", b: "MANIFEST" },
    { viewer: "ledger_lou", a: "LOG", b: "RADIO" },
    { viewer: "velvet_glove", a: "BOOT", b: "LOG" },
  ],
  partner: {
    name: "Ines Vale",
    station: "Station B · harbour office",
    hello: "Ines here, harbour office. My chat is on the files. Tell me what you need from my side.",
    finds: [
      { card: "TIDE", after: 16000, line: "My chat turned up the tide table." },
      { card: "MANIFEST", after: 34000, line: "We have the Marigold’s manifest. Something about the weight." },
      { card: "RADIO", after: 52000, line: "Radio log found. There’s a call from the Marigold at 23:02." },
      { card: "BOAT", after: 74000, line: "The rescue log is here. The lifeboat time is odd." },
    ],
    requests: [
      {
        card: "WICK",
        after: 26000,
        ask: "Was Bram’s lamp out of oil, or something else? Send me what you find at the lamp.",
        reply: "A cut wick! Then look at my tide table: the Teeth were dry for only twenty minutes. Sending it.",
        sends: ["TIDE"],
      },
      {
        card: "LOG",
        after: 58000,
        ask: "Did anyone visit the light tonight? Send me the keeper’s log.",
        reply: "Rook was at the lamp at 21:30? He radioed us at 23:02. Sending my radio log.",
        sends: ["RADIO"],
      },
    ],
    digging: "Still digging for that one. Give my chat a moment.",
    sending: "Here you go, partner.",
    agree: "Station B agrees. It was Rook. Two rooms, one proof.",
    disagree: "My files don’t back that. Look again at who knew the timing.",
    chat: [
      ["harbor_hen", "the tide board is wild tonight"],
      ["salt_and_ink", "manifest says 4 kg?? that’s nothing"],
      ["foghorn_fred", "station A, send the lamp stuff!"],
      ["harbor_hen", "ines, ask them about visitors"],
    ],
  },
  par: 210,
  ratings: [
    { min: 4400, seals: 3, title: "Master detectives" },
    { min: 3200, seals: 2, title: "Sharp partners" },
    { min: 2000, seals: 1, title: "Steady crew" },
    { min: 0, seals: 0, title: "Case closed" },
  ],
  accent: "#e0a050",
};

export const BOARD_CASES: Record<string, BoardCaseDef> = { express: EXPRESS, lighthouse: LIGHTHOUSE };

/**
 * Station A's practice chat. The handles and tones match the manuscript case (crowd.ts); they are listed here so a
 * board case does not load the manuscript. `eye` is how often a viewer's vote goes to a card the proof needs.
 */
export const BOARD_CREW: readonly { id: string; tone: ViewerTone; eye: number }[] = [
  { id: "ledger_lou", tone: "gold", eye: 0.86 },
  { id: "tick_tock_tess", tone: "ember", eye: 0.78 },
  { id: "inkwell_ivy", tone: "ivory", eye: 0.62 },
  { id: "marlowe_fan", tone: "brass", eye: 0.55 },
  { id: "velvet_glove", tone: "rose", eye: 0.5 },
  { id: "mudlark", tone: "copper", eye: 0.34 },
];

/** Station B's chat in the co-op case. */
export const PARTNER_CREW: Record<string, ViewerTone> = {
  harbor_hen: "brass",
  salt_and_ink: "ivory",
  foghorn_fred: "copper",
};
