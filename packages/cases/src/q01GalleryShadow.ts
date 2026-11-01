import type { CaseDefinition } from "@cluenite/engine";

// Q01 "The Gallery Shadow", authored from the v3 gameplay spec (02_GAMEPLAY_AND_CASES).
// Answers and proof requirements stay in this package. The web bundle must never import it.
export const Q01_GALLERY_SHADOW: CaseDefinition = {
  id: "Q01_GALLERY_SHADOW",
  version: 1,
  mode: "quick",
  title: "The Gallery Shadow",
  premise:
    "A gallery alarm triggered at 21:10; access log says the main door remained locked. A moving low shadow is visible.",
  question: "What triggered the alarm?",
  clues: [
    {
      id: "CAM",
      label: "Camera still, 21:10",
      teaser: "CCTV frame from the gallery entrance",
      observation:
        "21:10 CCTV still: a low, fast object with the tag R-07 passes the gallery entrance.",
      unlocks: ["CAM_R07"],
    },
    {
      id: "ACCESS",
      label: "Door log",
      teaser: "Access log for the main door",
      observation:
        "The door log shows no opening event from 21:00 to 21:30. This does not prove that nobody entered.",
      unlocks: [],
    },
    {
      id: "SCHEDULE",
      label: "Maintenance schedule",
      teaser: "Maintenance rota for the gallery floor",
      observation:
        "Cleaning robot R-07 is scheduled active in the gallery from 21:09 to 21:13.",
      unlocks: ["SCHEDULE_R07"],
    },
  ],
  evidence: [
    {
      id: "CAM_R07",
      label: "Tag R-07 on low object",
      category: "camera evidence",
    },
    {
      id: "SCHEDULE_R07",
      label: "Robot R-07 active window",
      category: "schedule evidence",
    },
  ],
  connections: [{ a: "CAM_R07", b: "SCHEDULE_R07" }],
  verdicts: [
    {
      id: "ROBOT",
      label: "The cleaning robot R-07",
      aliases: ["CLEANER", "R07"],
    },
    { id: "THIEF", label: "An intruder", aliases: [] },
  ],
  acceptedVerdicts: ["ROBOT"],
  falseVerdicts: ["THIEF"],
  proof: {
    evidence: [
      { id: "CAM_R07", category: "camera evidence" },
      { id: "SCHEDULE_R07", category: "schedule evidence" },
    ],
    links: [{ a: "CAM_R07", b: "SCHEDULE_R07", category: "connection" }],
  },
  revealText:
    "Verified: robot R-07 crossed the gallery sensor at 21:10, inside its scheduled cleaning window. The shadow was the cleaning robot.",
};
