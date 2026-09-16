const RING_API_BASE = "https://api.amazonvision.com";

export type RingEventEnvelope = {
  meta: { version?: string; time?: string; request_id: string; account_id?: string };
  data: {
    id: string;
    type: string;
    attributes?: { source?: string; timestamp?: number; sub_type?: string; component_ids?: string[] };
  };
};

export class RingApiClient {
  private readonly accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) throw new Error("A Ring access token is required");
    this.accessToken = accessToken;
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${RING_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.api+json",
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(`Ring API ${response.status}: ${await response.text()}`);
    return response;
  }

  async listDevices() {
    const response = await this.request("/v1/devices?include=capabilities,status,location,configurations");
    return response.json();
  }

  async getEventHistory(deviceId: string, eventTypes = "ding,motion.human") {
    const query = new URLSearchParams({ event_types: eventTypes });
    const response = await this.request(`/v1/history/devices/${encodeURIComponent(deviceId)}/events?${query}`);
    return response.json();
  }

  async downloadSnapshot(deviceId: string, body: Record<string, unknown>) {
    return this.request(`/v1/devices/${encodeURIComponent(deviceId)}/media/image/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
}

export async function verifyRingWebhook(rawBody: ArrayBuffer, signatureHeader: string, signingKey: string) {
  const received = signatureHeader.replace(/^sha256=/, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, rawBody);
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  let difference = expected.length ^ received.length;
  for (let index = 0; index < Math.min(expected.length, received.length); index += 1) difference |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  return difference === 0;
}
