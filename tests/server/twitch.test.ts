import { describe, expect, it, vi } from "vitest";
import {
  normalizeChatNotification,
  parseEventSubMessage,
} from "../../apps/server/src/twitch/chatEnvelope.js";
import { TwitchApi } from "../../apps/server/src/twitch/twitchApi.js";

const apiConfig = {
  clientId: "client-id-test",
  clientSecret: "client-secret-test",
  redirectUri: new URL("http://localhost:10000/api/auth/twitch/callback"),
};

describe("Twitch authorization and EventSub boundary", () => {
  it("requests only read access to broadcaster chat", () => {
    const url = new TwitchApi(apiConfig).authorizationUrl("opaque-state");
    expect(url.origin).toBe("https://id.twitch.tv");
    expect(url.searchParams.get("scope")).toBe("user:read:chat");
    expect(url.searchParams.get("state")).toBe("opaque-state");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("subscribes with broadcaster user-token conditions and the welcomed socket session", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 202 }));
    const api = new TwitchApi(apiConfig, fetcher);
    await api.subscribeChat("access-token", "1971641", "eventsub-session-1");

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.twitch.tv/helix/eventsub/subscriptions");
    expect(init?.headers).toMatchObject({
      "client-id": "client-id-test",
      authorization: "Bearer access-token",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      type: "channel.chat.message",
      version: "1",
      condition: { broadcaster_user_id: "1971641", user_id: "1971641" },
      transport: { method: "websocket", session_id: "eventsub-session-1" },
    });
  });

  it("revokes only through Twitch's server-side token endpoint", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    const api = new TwitchApi(apiConfig, fetcher);
    await expect(api.revokeToken("access-token")).resolves.toBe("revoked");

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://id.twitch.tv/oauth2/revoke");
    expect(init?.method).toBe("POST");
    expect(new URLSearchParams(String(init?.body))).toEqual(
      new URLSearchParams({
        client_id: "client-id-test",
        token: "access-token",
      }),
    );
  });

  it("rejects malformed provider token responses without exposing provider content", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "",
            refresh_token: "refresh",
            expires_in: 3600,
            scope: ["user:read:chat"],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const api = new TwitchApi(apiConfig, fetcher);
    await expect(api.exchangeCode("code")).rejects.toThrow(
      "invalid token response",
    );
  });

  it("normalizes authentic commands and discards foreign, non-command, and malformed events", () => {
    const envelope = {
      metadata: {
        message_id: "eventsub-1",
        message_type: "notification",
        message_timestamp: "2026-11-01T09:00:00.000Z",
      },
      payload: {
        subscription: { type: "channel.chat.message", version: "1" },
        event: {
          broadcaster_user_id: "1971641",
          chatter_user_id: "4145994",
          message_id: "chat-1",
          source_message_id: "source-chat-1",
          source_broadcaster_user_id: "1971641",
          message: { text: " !inspect CAM " },
        },
      },
    };
    const parsed = parseEventSubMessage(JSON.stringify(envelope));
    expect(parsed).not.toBeNull();
    expect(normalizeChatNotification(parsed!, "1971641")).toMatchObject({
      broadcasterId: "1971641",
      actorTwitchId: "4145994",
      eventSubMessageId: "eventsub-1",
      sourceMessageId: "source-chat-1",
      text: "!inspect CAM",
    });
    expect(normalizeChatNotification(parsed!, "299999999")).toBeNull();

    const sharedChat = structuredClone(envelope);
    sharedChat.payload.event.source_broadcaster_user_id = "112233";
    sharedChat.payload.event.source_message_id = "shared-source-message";
    const shared = normalizeChatNotification(
      parseEventSubMessage(sharedChat)!,
      "1971641",
    );
    expect(shared).toMatchObject({
      broadcasterId: "1971641",
      originBroadcasterId: "112233",
      sourceMessageId: "shared-source-message",
    });

    const nonCommand = structuredClone(envelope);
    nonCommand.payload.event.message.text = "hello clue night";
    expect(
      normalizeChatNotification(parseEventSubMessage(nonCommand)!, "1971641"),
    ).toBeNull();
    expect(parseEventSubMessage("{malformed-json")).toBeNull();
  });
});
