import type { RingEventEnvelope } from "./ring.ts";

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
