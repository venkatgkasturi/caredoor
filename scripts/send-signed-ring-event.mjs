import { createHmac, randomUUID } from "node:crypto";

const webhookUrl = process.env.RING_WEBHOOK_URL;
const signingKey = process.env.RING_HMAC_KEY;
const scenario = process.argv[2] === "expected" ? "expected" : "unmatched";

if (!webhookUrl || !signingKey) {
  console.error("Set RING_WEBHOOK_URL and RING_HMAC_KEY before sending a rehearsal event.");
  process.exit(1);
}

const now = Date.now();
const payload = {
  meta: { version: "1.1", time: new Date(now).toISOString(), request_id: randomUUID(), account_id: "caredoor-rehearsal" },
  data: {
    id: `ring-rehearsal-${now}`,
    type: scenario === "expected" ? "button_press" : "motion_detected",
    attributes: { source: "front-door-demo", timestamp: now, sub_type: "human" },
  },
};
const rawBody = JSON.stringify(payload);
const signature = `sha256=${createHmac("sha256", signingKey).update(rawBody).digest("hex")}`;
const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": signature }, body: rawBody });
const result = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`Webhook rejected rehearsal event (${response.status})`, result);
  process.exit(1);
}
console.log(JSON.stringify({ scenario, status: response.status, result }, null, 2));
