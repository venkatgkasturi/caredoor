# CareDoor — Devpost submission draft

## Elevator pitch

CareDoor turns Ring doorstep activity into calm, explainable caregiving workflows for older adults and the people who support them.

## Inspiration

A standard camera notification says that somebody is at the door. A remote caregiver still has to work out whether the visitor was expected, whether the resident understood the alert, and whether anyone needs to act. CareDoor adds that missing context without trying to identify people or replace human judgment.

## What it does

CareDoor correlates Ring motion and doorbell events with scheduled care visits. It explains why an event may need attention, offers a large-type resident view, and gives trusted caregivers three clear choices: mark the visit expected, call the resident, or escalate to the care circle. Households can enable metadata-only mode so the workflow functions without requesting images.

## How we built it

Ring Partner API integrations discover authorized devices, retrieve snapshots and event history, and accept real-time signed webhooks. The webhook handler verifies Ring's HMAC-SHA256 signature over the exact raw body and deduplicates `meta.request_id` before publishing a normalized event to Amazon SQS. Amazon Bedrock converts structured event facts into a calm one-sentence explanation under strict safety constraints. A deterministic rules explanation remains available when Bedrock is unavailable.

The responsive caregiver and resident experiences use Next.js, React and TypeScript. The production architecture is designed for API Gateway/Lambda or a compatible edge runtime, SQS, Bedrock, encrypted secrets, short-lived media access and lifecycle deletion.

## Ring technology used

- OAuth-compatible bearer-token API client
- Device discovery, capabilities, status, location and configuration retrieval
- HMAC-verified motion and doorbell webhooks
- Image Snapshot API
- Event History API
- Ring Developer Playground-compatible demo flow

## AWS technology used

- Amazon Bedrock Converse API for constrained plain-language event explanations
- Amazon SQS for decoupling real-time Ring delivery from downstream correlation and notification processing
- Planned production controls: KMS for secrets, CloudWatch for webhook health and S3 lifecycle deletion for temporary snapshots

## Privacy and safety

CareDoor does not use facial recognition, infer criminal intent, diagnose emergencies or make autonomous access decisions. It explains classifications using observable facts and keeps a person responsible for escalation. Media access is optional and the proposed production retention period is 24 hours or less.

## Challenges

The hardest engineering detail was treating a signed webhook as a security boundary: the signature must be calculated over the untouched body bytes, not parsed and re-serialized JSON. We also designed the experience so useful coordination still works when media is disabled or an AI explanation is unavailable.

## Accomplishments

- A coherent Ring event-to-caregiver action flow
- Explainable matching without biometric identity
- A resident interface designed for large text and low cognitive load
- Real Ring and AWS integration code with safe fallbacks
- A demo that remains reproducible through the Ring simulator

## What we learned

The most valuable Ring integration is not another camera viewer. It is a workflow that translates device events into an appropriate human decision while preserving consent, context and privacy.

## What's next

Calendar integrations, multilingual resident alerts, agency-level care coordination, richer device-health monitoring and controlled pilots with families and home-care professionals.

## Suggested tagline

Care starts at the doorstep.

## Three-minute demo beats

1. Explain the caregiver's uncertainty in 15 seconds.
2. Show an expected visit and the selected Ring device.
3. Run the expected-caregiver scenario, then the unmatched late-night visitor scenario.
4. Trigger the equivalent Ring Playground event and show HMAC verification, SQS delivery and the Bedrock-labeled explanation.
5. Toggle metadata-only mode.
6. Open the resident view.
7. Escalate to the care circle.
8. Close with the addressable audience and privacy model.
