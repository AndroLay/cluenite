import {spring} from 'remotion';

// "Cinematic Brown Noir" palette. Values are warm, low-chroma browns with
// a single amber accent, so evidence highlights stand out on dark frames.
export const COLOR = {
  ink: '#120c08',
  umber: '#2a1c13',
  walnut: '#4a3324',
  parchment: '#eadcc2',
  mute: '#a8957c',
  amber: '#d9a441',
  ember: '#b5563c',
  verdigris: '#6f9c8a',
} as const;

export const FONT = {
  display: '"EB Garamond", Georgia, serif',
  text: 'Inter, "Segoe UI", Arial, sans-serif',
  mono: 'Consolas, "Courier New", monospace',
} as const;

// Shared spring for entrances. Damped so motion settles without bounce,
// which suits the restrained noir tone.
export const reveal = (frame: number, fps: number, delay = 0): number =>
  spring({frame: frame - delay, fps, config: {damping: 200}});
