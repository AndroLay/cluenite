import type { CaseDefinition } from "@cluenite/engine";

// C01 requires evidence independently authored by both consenting broadcast
// channels. The joint fact is created only after both teams share their output.
export const C01_HARBOR_SIGNAL: CaseDefinition = {
  id: "C01_HARBOR_SIGNAL",
  version: 1,
  mode: "coop",
  title: "Signal of the Invisible Ship",
  premise:
    "A light flashes offshore, but radar shows no ship. Two communities investigate from different stations.",
  question: "What is producing the signal?",
  clues: [
    {
      id: "COAST",
      label: "Coastline camera",
      teaser: "Signal and position from field station A",
      observation:
        "The signal pattern is two short flashes, one long, then two short. Its bearing points to P4.",
      unlocks: [],
      team: "A",
    },
    {
      id: "RADAR",
      label: "Harbor radar log",
      teaser: "A clear radar window from records station B",
      observation:
        "No vessel appears on radar. That absence alone cannot identify the light source.",
      unlocks: ["RADAR_GAP"],
      team: "B",
    },
    {
      id: "MANUAL",
      label: "Maintenance reference",
      teaser: "The service signature for beacon B-17",
      observation:
        "The B-17 service record lists the same test pattern and coordinates near P4.",
      unlocks: [],
      team: "B",
    },
  ],
  evidence: [
    {
      id: "RADAR_GAP",
      label: "No vessel in the radar window",
      category: "radar record",
      team: "B",
    },
    {
      id: "SCAN_P4",
      label: "Physical signal source at P4",
      category: "field scan",
      team: "A",
    },
    {
      id: "MANUAL_B17_212",
      label: "B-17 pattern and position reference",
      category: "maintenance record",
      team: "B",
    },
    {
      id: "JOINT_PROOF_B17",
      label: "Signal and position match beacon B-17",
      category: "cross-community proof",
    },
  ],
  connections: [],
  stationActions: [
    {
      verb: "scan",
      targetId: "P4",
      team: "A",
      evidenceId: "SCAN_P4",
      message:
        "The field scan confirms a buoy-like object at P4 producing the observed pattern.",
    },
    {
      verb: "verify",
      targetId: "B17",
      team: "B",
      evidenceId: "MANUAL_B17_212",
      message:
        "The maintenance reference confirms B-17 uses that pattern at coordinates near P4.",
    },
  ],
  jointProof: {
    relationId: "MATCH_SIGNAL_AND_POSITION",
    evidenceFromA: "SCAN_P4",
    evidenceFromB: "MANUAL_B17_212",
    evidenceId: "JOINT_PROOF_B17",
    message:
      "Cross-community breakthrough: the independent field scan and maintenance record match beacon B-17.",
  },
  verdicts: [
    {
      id: "TEST_BUOY",
      label: "Beacon B-17 with its test sequence running",
      aliases: ["BUOY", "B17"],
    },
    {
      id: "GHOST_SHIP",
      label: "An invisible ship",
      aliases: ["SHIP", "GHOST"],
    },
  ],
  acceptedVerdicts: ["TEST_BUOY"],
  falseVerdicts: ["GHOST_SHIP"],
  proof: {
    evidence: [{ id: "JOINT_PROOF_B17", category: "cross-community proof" }],
    links: [],
    sharedEvidence: ["SCAN_P4", "MANUAL_B17_212"],
  },
  hints: [
    "Station A should inspect the physical source near P4.",
    "Station B should compare the signal with the B-17 service record.",
    "Share both independent findings to verify the match together.",
  ],
  revealText:
    "Verified: beacon B-17 is running its test sequence at P4. The field scan and maintenance record independently confirm the signal and position.",
};
