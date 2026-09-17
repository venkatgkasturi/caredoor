import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyRingWebhook, type RingEventEnvelope } from "../lib/ring.ts";
import { claimRingRequest, normalizeRingEvent, RingRequestDeduplicator } from "../lib/webhook.ts";

const envelope: RingEventEnvelope = {
  meta: { version: "1.1", time: "2026-09-16T23:42:00Z", request_id: "req-demo-001", account_id: "acct-demo" },
  data: { id: "ring-event-001", type: "motion_detected", attributes: { source: "front-door", timestamp: 1789602120000, sub_type: "human" } },
};

test("accepts the exact raw body signed with the Ring HMAC key", async () => {
  const key = "local-test-signing-key";
  const raw = Buffer.from(JSON.stringify(envelope));
  const signature = `sha256=${createHmac("sha256", key).update(raw).digest("hex")}`;
  assert.equal(await verifyRingWebhook(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), signature, key), true);
});

test("rejects a payload modified after signing", async () => {
  const key = "local-test-signing-key";
  const raw = Buffer.from(JSON.stringify(envelope));
  const signature = `sha256=${createHmac("sha256", key).update(raw).digest("hex")}`;
  const tampered = Buffer.from(JSON.stringify({ ...envelope, data: { ...envelope.data, type: "button_press" } }));
  assert.equal(await verifyRingWebhook(tampered.buffer.slice(tampered.byteOffset, tampered.byteOffset + tampered.byteLength), signature, key), false);
});

test("normalizes the Ring envelope into the downstream event contract", () => {
  assert.deepEqual(normalizeRingEvent(envelope), {
    requestId: "req-demo-001",
    accountId: "acct-demo",
    ringEventId: "ring-event-001",
    type: "motion_detected",
    deviceId: "front-door",
    detectedAt: 1789602120000,
    subtype: "human",
  });
});

test("deduplicates request IDs and permits them again after the TTL", () => {
  const deduplicator = new RingRequestDeduplicator(1_000);
  assert.equal(deduplicator.accept("req-1", 10_000), true);
  assert.equal(deduplicator.accept("req-1", 10_500), false);
  assert.equal(deduplicator.accept("req-1", 11_001), true);
});

test("rejects an incomplete Ring event envelope", () => {
  assert.throws(() => normalizeRingEvent({ meta: { request_id: "" }, data: { id: "", type: "" } }), /Invalid Ring event envelope/);
});

test("uses a conditional DynamoDB write for durable request claims", async () => {
  const previousTable = process.env.CAREDOOR_DEDUPE_TABLE;
  const previousTtl = process.env.CAREDOOR_DEDUPE_TTL_SECONDS;
  process.env.CAREDOOR_DEDUPE_TABLE = "caredoor-test-dedupe";
  process.env.CAREDOOR_DEDUPE_TTL_SECONDS = "3600";
  let input: Record<string, unknown> | undefined;
  const client = { send: async (command: { input: Record<string, unknown> }) => { input = command.input; return {}; } };
  try {
    const result = await claimRingRequest("req-durable", 1_789_602_120_000, client as never);
    assert.deepEqual(result, { accepted: true, store: "dynamodb" });
    assert.equal(input?.TableName, "caredoor-test-dedupe");
    assert.equal(input?.ConditionExpression, "attribute_not_exists(request_id)");
    assert.deepEqual(input?.Item, {
      request_id: "req-durable",
      received_at: "2026-09-16T23:42:00.000Z",
      expires_at: 1_789_605_720,
    });
  } finally {
    if (previousTable === undefined) delete process.env.CAREDOOR_DEDUPE_TABLE;
    else process.env.CAREDOOR_DEDUPE_TABLE = previousTable;
    if (previousTtl === undefined) delete process.env.CAREDOOR_DEDUPE_TTL_SECONDS;
    else process.env.CAREDOOR_DEDUPE_TTL_SECONDS = previousTtl;
  }
});

test("recognizes DynamoDB conditional failures as duplicate deliveries", async () => {
  const previousTable = process.env.CAREDOOR_DEDUPE_TABLE;
  process.env.CAREDOOR_DEDUPE_TABLE = "caredoor-test-dedupe";
  const duplicate = Object.assign(new Error("duplicate"), { name: "ConditionalCheckFailedException" });
  const client = { send: async () => { throw duplicate; } };
  try {
    assert.deepEqual(await claimRingRequest("req-repeat", Date.now(), client as never), {
      accepted: false,
      store: "dynamodb",
    });
  } finally {
    if (previousTable === undefined) delete process.env.CAREDOOR_DEDUPE_TABLE;
    else process.env.CAREDOOR_DEDUPE_TABLE = previousTable;
  }
});
