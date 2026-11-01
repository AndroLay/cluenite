export const migration0005ProcessedInputFingerprint = {
  name: "0005_processed_input_fingerprint",
  sql: `
    ALTER TABLE processed_inputs
      ADD COLUMN request_fingerprint text;
  `,
} as const;
