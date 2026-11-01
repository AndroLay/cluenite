import {
  chatActionEnvelopeSchema,
  MAX_COMMAND_LENGTH,
  type ChatActionEnvelope,
} from "@cluenite/contracts";

export interface EventSubMessage {
  readonly metadata: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseEventSubMessage(raw: unknown): EventSubMessage | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(value) || !isRecord(value.metadata) || !isRecord(value.payload))
    return null;
  return { metadata: value.metadata, payload: value.payload };
}

export function normalizeChatNotification(
  message: EventSubMessage,
  authorizedBroadcasterId: string,
): ChatActionEnvelope | null {
  if (message.metadata.message_type !== "notification") return null;
  const messageId = message.metadata.message_id;
  const timestamp = message.metadata.message_timestamp;
  const subscription = message.payload.subscription;
  const event = message.payload.event;
  if (
    typeof messageId !== "string" ||
    typeof timestamp !== "string" ||
    !isRecord(subscription) ||
    subscription.type !== "channel.chat.message" ||
    subscription.version !== "1" ||
    !isRecord(event) ||
    !isRecord(event.message)
  ) {
    return null;
  }
  const text = event.message.text;
  const broadcasterId = event.broadcaster_user_id;
  const actorTwitchId = event.chatter_user_id;
  const twitchMessageId = event.message_id;
  const sourceBroadcasterId = event.source_broadcaster_user_id;
  const originBroadcasterId =
    typeof sourceBroadcasterId === "string"
      ? sourceBroadcasterId
      : broadcasterId;
  const sourceMessageId = event.source_message_id;
  if (
    typeof text !== "string" ||
    text.length > MAX_COMMAND_LENGTH ||
    !text.trim().startsWith("!") ||
    typeof broadcasterId !== "string" ||
    broadcasterId !== authorizedBroadcasterId ||
    typeof actorTwitchId !== "string" ||
    typeof twitchMessageId !== "string" ||
    (typeof sourceBroadcasterId === "string" &&
      !/^\d{1,32}$/.test(sourceBroadcasterId)) ||
    (originBroadcasterId !== broadcasterId &&
      (typeof sourceMessageId !== "string" || sourceMessageId.length > 128))
  ) {
    return null;
  }
  const normalized = chatActionEnvelopeSchema.safeParse({
    provider: "twitch",
    eventSubMessageId: messageId,
    twitchMessageId,
    ...(typeof sourceMessageId === "string" ? { sourceMessageId } : {}),
    broadcasterId,
    originBroadcasterId,
    actorTwitchId,
    receivedAt: timestamp,
    text: text.trim(),
  });
  return normalized.success ? normalized.data : null;
}
