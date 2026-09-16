import { RingApiClient } from "@/lib/ring";

export async function GET() {
  const accessToken = process.env.RING_ACCESS_TOKEN;
  if (!accessToken) return Response.json({ error: "Ring is not configured" }, { status: 503 });
  try {
    return Response.json(await new RingApiClient(accessToken).listDevices());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ring request failed" }, { status: 502 });
  }
}
