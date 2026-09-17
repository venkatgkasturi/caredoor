# CareDoor

CareDoor is a privacy-first doorstep coordination companion for older adults and the people who care for them. It turns Ring motion and doorbell events into calm, explainable workflows: match an arrival to an expected care visit, show context only when the household permits it, and keep a human in control of every escalation.

## Why it matters

A standard camera alert says that somebody is at the door. CareDoor adds the missing caregiving context: whether the visit was expected, why an event needs attention, and who can help next. It deliberately avoids facial recognition and medical or emergency claims.

## Ring integration

The repository contains working Ring Partner API integration points:

- `GET /api/ring/devices` discovers authorized devices and their capabilities/status.
- `POST /api/ring/webhook` verifies Ring's `X-Signature` over the exact raw body with HMAC-SHA256, deduplicates `meta.request_id`, and normalizes device events.
- `POST /api/ring/snapshot` retrieves an authorized image snapshot with `private, no-store` caching.
- `lib/ring.ts` also implements Event History retrieval for reconciliation.

## AWS Builder integration

- `POST /api/events/explain` calls Amazon Bedrock through the official AWS SDK to turn structured event facts into one calm, plain-language sentence.
- The prompt explicitly prohibits identity guesses, danger claims, diagnoses, and unsupported facts.
- Signed Ring webhooks are claimed exactly once in DynamoDB and published to Amazon SQS when the corresponding environment values are configured.
- `infra/caredoor-aws.yaml` provisions the encrypted queue, dead-letter queue, TTL-enabled deduplication table, and a least-privilege runtime policy.
- If Bedrock is unavailable, the caregiver experience falls back to deterministic safety rules rather than blocking the alert.
- The interface labels whether its explanation came from Amazon Bedrock or CareDoor safety rules.

The live UI includes two simulator scenarios—an expected caregiver and an unmatched late-night visitor—so the complete judging flow remains reliable even when a physical device is unavailable. Both scenarios use the same tested correlation rules. For the final demo, the Ring Developer Playground should send the same motion or button event to the webhook endpoint.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add staging credentials from the Ring Developer Portal.
3. Deploy `infra/caredoor-aws.yaml`, then add AWS credentials, a Bedrock model ID, and the stack's queue/table outputs.
4. Start the app with `npm run dev`.
5. Configure the public HTTPS URL ending in `/api/ring/webhook` as the Ring webhook URL.

Never commit Ring access tokens, refresh tokens, client secrets, or HMAC keys.

### Rehearse a signed webhook

Set `RING_WEBHOOK_URL` to your local or staging `/api/ring/webhook` endpoint and set `RING_HMAC_KEY`, then run `npm run demo:ring-event -- expected` or `npm run demo:ring-event -- unmatched`. The script signs the exact transmitted bytes and fails on any non-2xx response.

Run `npm test` to verify schedule correlation, raw-body signature handling, tamper rejection, normalization and request deduplication.

## Demo flow

1. Show tomorrow's expected physical-therapy visit.
2. Select **Run Ring demo → Expected caregiver** to show a successful schedule match.
3. Run **Late-night visitor** to show repeated activity with no matching visit.
4. Show the explainable reason and its Bedrock or safety-rule source label.
5. Toggle **Metadata only** to demonstrate that CareDoor can work without requesting an image.
6. Preview the large-type resident experience.
7. Escalate to the trusted care circle.

## Architecture

Ring signed webhook → HMAC verification → DynamoDB idempotency claim → Amazon SQS → appointment correlation → optional Ring snapshot → Amazon Bedrock explanation → caregiver and resident experiences.

For production, the normalized event should be processed asynchronously from SQS. Tokens should be encrypted with AWS KMS, snapshots should use short-lived signed URLs and lifecycle deletion, and operational events should be monitored in CloudWatch.

## Privacy choices

- Metadata-only mode
- No facial recognition
- No autonomous emergency decisions
- Neutral, explainable classifications
- Human confirmation for every escalation
- Short snapshot retention

## Hackathon tracks

- Primary: Ring — caretaking and accessibility
- Mini challenge: AWS Builder

## License

MIT
