export const migration0003CoopInviteDecline = {
  name: "0003_coop_invite_decline",
  sql: `
    ALTER TABLE coop_invites
      ADD COLUMN declined_at timestamptz,
      ADD COLUMN decline_idempotency_key text;
  `,
} as const;
