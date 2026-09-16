import { explainDoorEvent, type ExplainableDoorEvent } from "@/lib/aws";

export async function POST(request: Request) {
  const input = await request.json() as Partial<ExplainableDoorEvent>;
  if (!input.eventType || !input.detectedAt || !input.deviceName) {
    return Response.json({ error: "eventType, detectedAt, and deviceName are required" }, { status: 400 });
  }
  const event: ExplainableDoorEvent = {
    eventType: input.eventType,
    detectedAt: input.detectedAt,
    repeatedCount: Math.max(1, Math.min(Number(input.repeatedCount) || 1, 20)),
    windowMinutes: Math.max(1, Math.min(Number(input.windowMinutes) || 1, 60)),
    hasMatchingVisit: Boolean(input.hasMatchingVisit),
    deviceName: input.deviceName,
  };
  try {
    const result = await explainDoorEvent(event);
    return Response.json({ explanation: result.text, source: "amazon-bedrock", requestId: result.requestId });
  } catch (error) {
    console.error("Bedrock explanation failed", error);
    return Response.json({ error: "Explanation is temporarily unavailable" }, { status: 503 });
  }
}
