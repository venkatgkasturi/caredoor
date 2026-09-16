import { type RingEventEnvelope, verifyRingWebhook } from "@/lib/ring";

const recentlyProcessed = new Map<string, number>();

export async function POST(request: Request) {
  const signingKey = process.env.RING_HMAC_KEY;
  if (!signingKey) return Response.json({ error: "Ring webhook is not configured" }, { status: 503 });
  const rawBody = await request.arrayBuffer();
  const signature = request.headers.get("X-Signature") ?? "";
  if (!(await verifyRingWebhook(rawBody, signature, signingKey))) return Response.json({ error: "Invalid Ring signature" }, { status: 401 });

  const event = JSON.parse(new TextDecoder().decode(rawBody)) as RingEventEnvelope;
  if (!event.meta?.request_id || !event.data?.type) return Response.json({ error: "Invalid Ring event" }, { status: 400 });
  if (recentlyProcessed.has(event.meta.request_id)) return Response.json({ accepted: true, duplicate: true });
  recentlyProcessed.set(event.meta.request_id, Date.now());
  for (const [requestId, createdAt] of recentlyProcessed) if (Date.now() - createdAt > 3_600_000) recentlyProcessed.delete(requestId);

  // Production: publish this normalized envelope to SQS/EventBridge and return immediately.
  const normalized = {
    requestId: event.meta.request_id,
    accountId: event.meta.account_id,
    ringEventId: event.data.id,
    type: event.data.type,
    deviceId: event.data.attributes?.source,
    detectedAt: event.data.attributes?.timestamp ?? Date.now(),
    subtype: event.data.attributes?.sub_type,
  };
  console.info("Accepted Ring event", normalized);
  return Response.json({ accepted: true, requestId: normalized.requestId });
}
