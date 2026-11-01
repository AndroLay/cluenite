import { describe, expect, it } from "vitest";
import {
  chatActionEnvelopeSchema,
  commandResultSchema,
  createSessionSchema,
  submitCommandSchema,
  twitchIdentitySchema,
} from "../../packages/contracts/src/index.js";

describe("backend boundary contracts", () => {
  it("accepts a normalized Twitch chat message with provider identities", () => {
    const parsed = chatActionEnvelopeSchema.safeParse({
      provider: "twitch",
      eventSubMessageId: "a39d2b4c-36ce-4df7-9e8a-8e60d5ac2980",
      twitchMessageId: "c9d23af3-71d8-4fd2-a0f8-5f44b818de75",
      sourceMessageId: null,
      broadcasterId: "1971641",
      originBroadcasterId: "1971641",
      actorTwitchId: "4145994",
      receivedAt: "2026-11-01T09:00:00.000Z",
      text: "!inspect CAM",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects untrusted extra fields and oversized chat text", () => {
    const envelope = {
      provider: "twitch",
      eventSubMessageId: "a39d2b4c-36ce-4df7-9e8a-8e60d5ac2980",
      twitchMessageId: "c9d23af3-71d8-4fd2-a0f8-5f44b818de75",
      broadcasterId: "1971641",
      originBroadcasterId: "1971641",
      actorTwitchId: "4145994",
      receivedAt: "2026-11-01T09:00:00.000Z",
      text: "!inspect CAM",
    };

    expect(
      chatActionEnvelopeSchema.safeParse({ ...envelope, forgedActor: "1" })
        .success,
    ).toBe(false);
    expect(
      chatActionEnvelopeSchema.safeParse({ ...envelope, text: "x".repeat(501) })
        .success,
    ).toBe(false);
  });

  it("accepts only a case identifier when creating a session", () => {
    expect(
      createSessionSchema.safeParse({ caseId: "Q01_GALLERY_SHADOW" }).success,
    ).toBe(true);
    expect(
      createSessionSchema.safeParse({ caseId: "../../private" }).success,
    ).toBe(false);
    expect(
      createSessionSchema.safeParse({
        caseId: "Q01_GALLERY_SHADOW",
        hostId: "forged",
      }).success,
    ).toBe(false);
  });

  it("accepts only bounded Twitch profile identities", () => {
    expect(
      twitchIdentitySchema.safeParse({
        id: "1971641",
        login: "cluenitehost",
        displayName: "Cluenite Host",
      }).success,
    ).toBe(true);
    expect(
      twitchIdentitySchema.safeParse({
        id: "1971641",
        login: "invalid login",
        displayName: "Host",
      }).success,
    ).toBe(false);
  });

  it("validates the explicit idempotency conflict result and optional socket key", () => {
    expect(
      commandResultSchema.safeParse({
        code: "IDEMPOTENCY_CONFLICT",
        reason: "IDEMPOTENCY_KEY_REUSED",
        message: "This idempotency key was used for a different request.",
        missing: [],
        revision: 3,
      }).success,
    ).toBe(true);
    expect(
      submitCommandSchema.safeParse({
        sessionId: "session-1",
        text: "!inspect CAM",
      }).success,
    ).toBe(true);
    expect(
      submitCommandSchema.safeParse({
        sessionId: "session-1",
        text: "!inspect CAM",
        idempotencyKey: "socket-command-retry-0001",
      }).success,
    ).toBe(true);
    expect(
      submitCommandSchema.safeParse({
        sessionId: "session-1",
        text: "!inspect CAM",
        idempotencyKey: "short",
      }).success,
    ).toBe(false);
  });
});
