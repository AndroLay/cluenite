import type { CaseDefinition } from "@cluenite/engine";

// M01 short-play backend path: an earlier authorized relocation disproves a
// theft-during-blackout theory and the B4 work order justifies the final reveal.
export const M01_MISSING_TROPHY: CaseDefinition = {
  id: "M01_MISSING_TROPHY",
  version: 1,
  mode: "mystery",
  title: "The Missing Festival Trophy",
  premise:
    "The festival trophy was visible at 18:47 and missing at 19:02, just after a blackout.",
  question: "Was it stolen, or was it moved for another reason?",
  clues: [
    {
      id: "PHOTO",
      label: "18:47 gallery photo",
      teaser: "The trophy before the blackout",
      observation: "The trophy is still in its case at 18:47.",
      unlocks: ["PHOTO_1847"],
    },
    {
      id: "CASE",
      label: "Display case warning",
      teaser: "A temperature warning before the incident",
      observation:
        "The display reported overheating at 18:56, three minutes before the blackout.",
      unlocks: ["HEAT_WARNING", "DISPLAY_EMPTY"],
    },
    {
      id: "ACCESS",
      label: "Maintenance access log",
      teaser: "An access record from before the blackout",
      observation:
        "The case was opened with maintenance access at 18:58. The blackout began at 19:01.",
      unlocks: ["ACCESS_RECORD"],
    },
    {
      id: "TROLLEY",
      label: "Trolley route card",
      teaser: "A protected move to cold storage",
      observation:
        "A covered trolley moved from the gallery toward cold storage B4 at 18:59.",
      unlocks: ["CART_MARK"],
    },
    {
      id: "WORK_ORDER",
      label: "Signed safety work order",
      teaser: "A signed order for an authorized move",
      observation:
        "The signed 18:57 work order authorizes moving the trophy to B4; the matching serial scan confirms it is there.",
      unlocks: ["SIGNED_ORDER", "B4_CONFIRMED", "TROPHY_FOUND"],
    },
  ],
  evidence: [
    {
      id: "PHOTO_1847",
      label: "Trophy visible at 18:47",
      category: "before photo",
    },
    {
      id: "HEAT_WARNING",
      label: "Overheating warning at 18:56",
      category: "timeline",
    },
    {
      id: "DISPLAY_EMPTY",
      label: "Display empty at discovery",
      category: "scene evidence",
    },
    {
      id: "ACCESS_RECORD",
      label: "Maintenance access at 18:58",
      category: "access record",
    },
    {
      id: "CART_MARK",
      label: "Trolley route to B4 at 18:59",
      category: "location evidence",
    },
    {
      id: "TIMELINE_RECONSTRUCTED",
      label: "Relocation preceded the blackout",
      category: "timeline proof",
    },
    {
      id: "SIGNED_ORDER",
      label: "Signed safety relocation order",
      category: "authorization",
    },
    {
      id: "B4_CONFIRMED",
      label: "Matching serial scan at B4",
      category: "location evidence",
    },
    {
      id: "TROPHY_FOUND",
      label: "Trophy found in cold storage",
      category: "recovery",
    },
  ],
  connections: [],
  sequences: [
    {
      id: "MISSING_TROPHY_TIMELINE",
      label: "Incident timeline",
      expectedOrder: ["HEAT", "ORDER", "OPEN", "TROLLEY", "BLACKOUT"],
      // The client receives the choices without the expected order. Server validation
      // remains authoritative when the player submits their reconstruction.
      events: [
        { id: "BLACKOUT", label: "Gallery blackout" },
        { id: "TROLLEY", label: "Covered trolley leaves the gallery" },
        { id: "OPEN", label: "Display case opened" },
        { id: "ORDER", label: "Safety work order issued" },
        { id: "HEAT", label: "Display temperature warning" },
      ],
      requiredEvidence: ["HEAT_WARNING", "ACCESS_RECORD", "CART_MARK"],
      unlocks: ["TIMELINE_RECONSTRUCTED"],
      successText:
        "The case opened and the trolley left before the blackout began.",
    },
  ],
  theories: [
    {
      id: "BLACKOUT_THEFT",
      label: "The trophy was stolen during the blackout",
    },
  ],
  challenges: [
    {
      id: "ACCESS_PRECEDES_BLACKOUT",
      theoryId: "BLACKOUT_THEFT",
      evidenceId: "ACCESS_RECORD",
      status: "CONTRADICTED",
      message:
        "That timing contradicts a theft during the blackout: the authorized move began before the lights went out.",
    },
  ],
  verdicts: [
    {
      id: "SAFETY_MOVE",
      label: "Authorized safety relocation to B4",
      aliases: ["SAFE_MOVE"],
    },
    { id: "THEFT", label: "The trophy was stolen", aliases: ["THIEF"] },
  ],
  acceptedVerdicts: ["SAFETY_MOVE"],
  falseVerdicts: ["THEFT"],
  proof: {
    evidence: [
      { id: "PHOTO_1847", category: "before photo" },
      { id: "ACCESS_RECORD", category: "access record" },
      { id: "CART_MARK", category: "location evidence" },
      { id: "TIMELINE_RECONSTRUCTED", category: "timeline proof" },
      { id: "SIGNED_ORDER", category: "authorization" },
      { id: "B4_CONFIRMED", category: "location evidence" },
      { id: "TROPHY_FOUND", category: "recovery" },
    ],
    links: [],
    sequences: ["MISSING_TROPHY_TIMELINE"],
    challenges: ["ACCESS_PRECEDES_BLACKOUT"],
  },
  hints: [
    "Put the warning, case opening, trolley move, and blackout in time order.",
    "The access record and trolley route both happen before 19:01.",
    "Compare the signed safety order with the matching B4 serial scan.",
  ],
  revealText:
    "Verified: a signed safety order moved the overheating trophy to cold storage B4 before the blackout. The matching serial scan confirms it was recovered there.",
};
