export const migration0004PartialPhase = {
  name: "0004_partial_phase",
  sql: `
    ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_phase_check;
    ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_phase_check
      CHECK (phase IN ('COOP_WAITING', 'READY', 'ACTIVE', 'PAUSED', 'RESOLVED', 'PARTIAL', 'CANCELLED'));
  `,
} as const;
