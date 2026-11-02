import {staticFile} from 'remotion';

// Real recordings go in public/footage/. Set `file` to the file name once a
// recording exists. While `file` is null, the placeholder card stays on screen
// and the draft badge is shown, so placeholder footage cannot pass as proof.
export type FootageId =
  | 'S1-stream'
  | 'S2-chat'
  | 'S3-link'
  | 'S4-dashboard'
  | 'S4-board'
  | 'S5-correction'
  | 'S5-theory'
  | 'S6-responsive'
  | 'S7-codex'
  | 'S7-tests'
  | 'S8-reveal';

export type FootageSlot = {
  file: string | null;
  brief: string;
};

export const FOOTAGE: Record<FootageId, FootageSlot> = {
  'S1-stream': {
    file: null,
    brief: 'Owner game-like scene with the compact Quick Case overlay in an OBS browser source. Crop the URL.',
  },
  'S2-chat': {
    file: null,
    brief: 'Twitch chat: a test viewer types !look CAM. The overlay shows "Camera still, 21:10" and unlocks CAM_R07.',
  },
  'S3-link': {
    file: null,
    brief: 'Second test viewer: !look SCHEDULE, !link CAM_R07 SCHEDULE_R07, !solve ROBOT. Reveal text on screen.',
  },
  'S4-dashboard': {
    file: null,
    brief: 'Signed-in /dashboard. Do not show a Start control until one exists (plan Section 5, item 7).',
  },
  'S4-board': {
    file: null,
    brief: 'M01 board with evidence panels open. Do not show the hint button.',
  },
  'S5-correction': {
    file: null,
    brief: 'Wrong !order, then !order HEAT ORDER OPEN TROLLEY BLACKOUT. Timeline reconstructed.',
  },
  'S5-theory': {
    file: null,
    brief: '!theory BLACKOUT_THEFT, then !challenge BLACKOUT_THEFT ACCESS_RECORD. Contradiction shown.',
  },
  'S6-responsive': {
    // Captured 2 Nov 2026 by scripts/capture-responsive.mjs from the local dev server
    // (signed-out pages). Overflow measured 0 px on all four routes at both widths.
    file: 'S6-responsive.mp4',
    brief: 'Signed-out /guide, /settings, /setup, /coop at 390 px and 1280 px.',
  },
  'S7-codex': {
    file: null,
    brief: 'Codex /status session record. Crop the session ID if needed. Never write a placeholder ID.',
  },
  'S7-tests': {
    file: null,
    brief: 'Live terminal test run (command from CONTRIBUTING.md) and the EventSub adapter code.',
  },
  'S8-reveal': {
    file: null,
    brief: 'The real reveal screen from S3, used under the Cluenite mark.',
  },
};

export const footageSrc = (id: FootageId): string | null => {
  const file = FOOTAGE[id].file;
  return file === null ? null : staticFile(`footage/${file}`);
};

export const hasPlaceholders = Object.values(FOOTAGE).some((slot) => slot.file === null);
