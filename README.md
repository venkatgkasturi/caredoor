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

The live UI includes a simulator so the complete judging flow remains reliable even when a physical device is unavailable. For the final demo, the Ring Developer Playground should send the same motion or button event to the webhook endpoint.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add staging credentials from the Ring Developer Portal.
3. Start the app with `npm run dev`.
4. Configure the public HTTPS URL ending in `/api/ring/webhook` as the Ring webhook URL.

Never commit Ring access tokens, refresh tokens, client secrets, or HMAC keys.

## Demo flow

1. Show tomorrow's expected physical-therapy visit.
2. Select **Simulate Ring event** to receive an unmatched late-night visitor event.
3. Show the explainable reason: unusual timing and repeated activity.
4. Toggle **Metadata only** to demonstrate that CareDoor can work without requesting an image.
5. Preview the large-type resident experience.
6. Escalate to the trusted care circle.

## Architecture

Ring signed webhook → webhook verification/deduplication → normalized event → appointment correlation → optional snapshot → caregiver and resident experiences.

For production, the normalized event should be published to Amazon SQS or EventBridge and processed asynchronously. Tokens should be encrypted with AWS KMS, snapshots should use short-lived signed URLs and lifecycle deletion, and operational events should be monitored in CloudWatch.

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
