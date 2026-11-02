// Line icons for the site pages, drawn on a 24 x 24 grid and stroked with currentColor, so an icon takes the
// colour of its text. They replace the Unicode glyphs that earlier passes used as icons. The nav set matches the
// paths DashboardPage.vue draws inline, so the two side rails look the same.

export type SiteIconName =
  | "search"
  | "arrow-right"
  | "arrow-up"
  | "arrow-down"
  | "check"
  | "sparkle"
  | "document"
  | "clock"
  | "target"
  | "alert"
  | "plus"
  | "chevron-right"
  | "square"
  | "dashboard"
  | "library"
  | "live"
  | "people"
  | "monitor"
  | "settings"
  | "sound-on"
  | "sound-off"
  | "restart"
  | "hint"
  | "link"
  | "lock"
  | "scales"
  | "chat"
  | "play"
  | "eye"
  | "send"
  | "close"
  | "arrow-left"
  | "home"
  | "copy"
  | "plug"
  | "broadcast"
  | "book"
  | "gamepad"
  | "spinner"
  | "x-circle"
  | "check-circle";

export const ICON_PATHS: Record<SiteIconName, readonly string[]> = {
  search: ["M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13Z", "M15.5 15.5 21 21"],
  "arrow-right": ["M5 12h14", "M13 6l6 6-6 6"],
  "arrow-up": ["M12 19V5", "M6 11l6-6 6 6"],
  "arrow-down": ["M12 5v14", "M6 13l6 6 6-6"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  sparkle: ["M12 3c.6 4.6 2.4 6.4 7 7c-4.6.6-6.4 2.4-7 7c-.6-4.6-2.4-6.4-7-7c4.6-.6 6.4-2.4 7-7Z"],
  document: ["M6 3.5h8l4 4v13H6Z", "M14 3.5v4h4", "M9 12h6", "M9 15.5h6"],
  clock: ["M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16Z", "M12 8v4.5l3 2"],
  target: ["M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16Z", "M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z"],
  alert: ["M12 4 21 19.5H3Z", "M12 10v4.5", "M12 17.2v.3"],
  plus: ["M12 5v14", "M5 12h14"],
  "chevron-right": ["M9 6l6 6-6 6"],
  square: ["M5 5h14v14H5Z"],
  dashboard: ["M4 4h6.5v7H4z", "M13.5 4H20v4h-6.5z", "M13.5 11H20v9h-6.5z", "M4 14h6.5v6H4z"],
  library: ["M4 5h16", "M4 12h16", "M4 19h16", "M4 5v14", "M20 5v14"],
  live: ["M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0", "M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0"],
  people: [
    "M6 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
    "M3.5 19.5a5.5 5.5 0 0 1 11 0",
    "M16 8.5a2.5 2.5 0 0 1 0 5",
    "M17.5 14.5a5 5 0 0 1 3 5",
  ],
  monitor: ["M3.5 5h17v11h-17z", "M9 20h6", "M12 16v4"],
  settings: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9", "M13 5v4", "M7 15v4"],
  "sound-on": ["M4 9.5h3.5L12 5.5v13l-4.5-4H4Z", "M15.5 9a4 4 0 0 1 0 6", "M18 6.5a7.5 7.5 0 0 1 0 11"],
  "sound-off": ["M4 9.5h3.5L12 5.5v13l-4.5-4H4Z", "M16 9.5l5 5", "M21 9.5l-5 5"],
  restart: ["M4.5 12a7.5 7.5 0 1 0 2.2-5.3", "M4.5 4.5V8H8"],
  hint: [
    "M9 18h6",
    "M10 21h4",
    "M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z",
  ],
  link: [
    "M9.5 14.5l5-5",
    "M7.5 12.5l-1.7 1.7a3 3 0 0 0 4.2 4.2l1.7-1.7",
    "M16.5 11.5l1.7-1.7a3 3 0 0 0-4.2-4.2l-1.7 1.7",
  ],
  lock: ["M6 11h12v9H6Z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
  scales: ["M12 4v16", "M7 20h10", "M5 7h14", "M5 7l-2.5 6a2.5 2.5 0 0 0 5 0Z", "M19 7l-2.5 6a2.5 2.5 0 0 0 5 0Z"],
  chat: ["M4 5h16v11H9l-5 4Z"],
  play: ["M8 5.5v13l10-6.5Z"],
  eye: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z", "M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z"],
  send: ["M3.5 11.5 20.5 4l-7.5 17-2.5-7Z", "M10.5 14 20.5 4"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  "arrow-left": ["M19 12H5", "M11 6l-6 6 6 6"],
  home: ["M4 11.5 12 5l8 6.5", "M6.5 10v9.5h11V10", "M10 19.5v-5h4v5"],
  copy: ["M8.5 8.5h11v11h-11Z", "M15.5 8.5v-4h-11v11h4"],
  plug: ["M9 3.5v4", "M15 3.5v4", "M6.5 7.5h11v3a5.5 5.5 0 0 1-11 0Z", "M12 16v4.5"],
  broadcast: [
    "M12 10.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3Z",
    "M8.5 8.5a5 5 0 0 0 0 7",
    "M15.5 8.5a5 5 0 0 1 0 7",
    "M5.5 5.5a9 9 0 0 0 0 13",
    "M18.5 5.5a9 9 0 0 1 0 13",
  ],
  book: ["M4 5.5c3-1.3 5.7-1.3 8 .8v13c-2.3-2.1-5-2.1-8-.8Z", "M20 5.5c-3-1.3-5.7-1.3-8 .8v13c2.3-2.1 5-2.1 8-.8Z"],
  gamepad: [
    "M7 8h10a4 4 0 0 1 3.9 4.9l-1 4.3a2 2 0 0 1-3.4.9L14.3 16H9.7l-2.2 2.1a2 2 0 0 1-3.4-.9l-1-4.3A4 4 0 0 1 7 8Z",
    "M8 11v3",
    "M6.5 12.5h3",
    "M15.5 11.5v.1",
    "M17.5 13.5v.1",
  ],
  spinner: ["M12 3.5a8.5 8.5 0 1 1-8.5 8.5"],
  "x-circle": ["M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17Z", "M9 9l6 6", "M15 9l-6 6"],
  "check-circle": ["M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17Z", "M8 12.5l2.8 2.8L16.5 9.5"],
};
