import { type RingEventEnvelope, verifyRingWebhook } from "@/lib/ring";
import { enqueueRingEvent } from "@/lib/aws";
import { normalizeRingEvent, RingRequestDeduplicator } from "@/lib/webhook";

const deduplicator = new RingRequestDeduplicator();

export async function POST(request: Request) {
  const signingKey = process.env.RING_HMAC_KEY;
  if (!signingKey) return Response.json({ error: "Ring webhook is not configured" }, { status: 503 });
  const rawBody = await request.arrayBuffer();
  const signature = request.headers.get("X-Signature") ?? "";
  if (!(await verifyRingWebhook(rawBody, signature, signingKey))) return Response.json({ error: "Invalid Ring signature" }, { status: 401 });

  const event = JSON.parse(new TextDecoder().decode(rawBody)) as RingEventEnvelope;
  let normalized;
  try {
    normalized = normalizeRingEvent(event);
  } catch {
    return Response.json({ error: "Invalid Ring event" }, { status: 400 });
  }
  if (!deduplicator.accept(normalized.requestId)) return Response.json({ accepted: true, duplicate: true });

  // Publish the normalized envelope so Ring delivery stays separate from downstream decisions.
  const queue = await enqueueRingEvent(normalized);
  console.info("Accepted Ring event", { ...normalized, queue });
  return Response.json({ accepted: true, requestId: normalized.requestId, queued: queue.queued });
}
