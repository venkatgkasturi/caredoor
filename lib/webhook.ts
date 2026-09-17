import type { RingEventEnvelope } from "./ring.ts";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

export type NormalizedRingEvent = {
  requestId: string;
  accountId?: string;
  ringEventId: string;
  type: string;
  deviceId?: string;
  detectedAt: number;
  subtype?: string;
};

export function normalizeRingEvent(event: RingEventEnvelope): NormalizedRingEvent {
  if (!event.meta?.request_id || !event.data?.id || !event.data?.type) throw new Error("Invalid Ring event envelope");
  return {
    requestId: event.meta.request_id,
    accountId: event.meta.account_id,
    ringEventId: event.data.id,
    type: event.data.type,
    deviceId: event.data.attributes?.source,
    detectedAt: event.data.attributes?.timestamp ?? Date.now(),
    subtype: event.data.attributes?.sub_type,
  };
}

export class RingRequestDeduplicator {
  private readonly processed = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMs = 3_600_000) {
    this.ttlMs = ttlMs;
  }

  accept(requestId: string, now = Date.now()) {
    this.prune(now);
    if (this.processed.has(requestId)) return false;
    this.processed.set(requestId, now);
    return true;
  }

  private prune(now: number) {
    for (const [requestId, createdAt] of this.processed) if (now - createdAt > this.ttlMs) this.processed.delete(requestId);
  }
}

type DynamoDocumentClient = Pick<DynamoDBDocumentClient, "send">;

let documentClient: DynamoDBDocumentClient | undefined;
const localDeduplicator = new RingRequestDeduplicator();

function getDocumentClient() {
  if (!documentClient) {
    documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    }));
  }
  return documentClient;
}

/** Claims a Ring delivery exactly once across runtime instances. */
export async function claimRingRequest(
  requestId: string,
  now = Date.now(),
  client: DynamoDocumentClient = getDocumentClient(),
) {
  const tableName = process.env.CAREDOOR_DEDUPE_TABLE;
  if (!tableName) return { accepted: localDeduplicator.accept(requestId, now), store: "memory" as const };

  const ttlSeconds = Number(process.env.CAREDOOR_DEDUPE_TTL_SECONDS ?? 86_400);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds < 60) throw new Error("CAREDOOR_DEDUPE_TTL_SECONDS must be at least 60");

  try {
    await client.send(new PutCommand({
      TableName: tableName,
      Item: {
        request_id: requestId,
        received_at: new Date(now).toISOString(),
        expires_at: Math.floor(now / 1000) + Math.floor(ttlSeconds),
      },
      ConditionExpression: "attribute_not_exists(request_id)",
    }));
    return { accepted: true, store: "dynamodb" as const };
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      return { accepted: false, store: "dynamodb" as const };
    }
    throw error;
  }
}
