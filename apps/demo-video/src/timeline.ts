export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const toFrames = (seconds: number): number => Math.round(seconds * FPS);

export type SegmentId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';

export type Segment = {
  id: SegmentId;
  title: string;
  startSec: number;
  endSec: number;
};

// Mirrors the segment table in docs/demo/DEMO_VIDEO_PLAN.md (Section 3).
// Total length is 2:55, the ceiling requested by the owner.
export const SEGMENTS: readonly Segment[] = [
  {id: 'S1', title: 'Streamer example', startSec: 0, endSec: 12},
  {id: 'S2', title: 'First viewer evidence', startSec: 12, endSec: 35},
  {id: 'S3', title: 'Link and verdict', startSec: 35, endSec: 52},
  {id: 'S4', title: 'Dashboard and Mystery Live', startSec: 52, endSec: 80},
  {id: 'S5', title: 'Timeline correction and theory challenge', startSec: 80, endSec: 105},
  {id: 'S6', title: 'Responsive check', startSec: 105, endSec: 137},
  {id: 'S7', title: 'Built with Codex', startSec: 137, endSec: 160},
  {id: 'S8', title: 'Close', startSec: 160, endSec: 175},
];

export const TOTAL_SECONDS = 175;
export const DURATION_IN_FRAMES = toFrames(TOTAL_SECONDS);

// Guard against gaps or overlaps when segments are edited later.
SEGMENTS.forEach((segment, index) => {
  const previous = SEGMENTS[index - 1];
  if (previous && previous.endSec !== segment.startSec) {
    throw new Error(`Segment ${segment.id} does not start where ${previous.id} ends.`);
  }
});
if (SEGMENTS[SEGMENTS.length - 1].endSec !== TOTAL_SECONDS) {
  throw new Error('Segments must end at TOTAL_SECONDS.');
}

export const segmentRange = (id: SegmentId): {from: number; durationInFrames: number} => {
  const segment = SEGMENTS.find((item) => item.id === id);
  if (!segment) {
    throw new Error(`Unknown segment ${id}`);
  }
  const from = toFrames(segment.startSec);
  return {from, durationInFrames: toFrames(segment.endSec) - from};
};
