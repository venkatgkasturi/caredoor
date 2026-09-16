import { RingApiClient } from "@/lib/ring";

export async function POST(request: Request) {
  const accessToken = process.env.RING_ACCESS_TOKEN;
  if (!accessToken) return Response.json({ error: "Ring is not configured" }, { status: 503 });
  const input = await request.json() as { deviceId?: string; event?: Record<string, unknown> };
  if (!input.deviceId) return Response.json({ error: "deviceId is required" }, { status: 400 });
  try {
    const response = await new RingApiClient(accessToken).downloadSnapshot(input.deviceId, input.event ?? {});
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Snapshot request failed" }, { status: 502 });
  }
}
