# Judging matrix

Use this as the final submission audit.

| Criterion | Evidence in CareDoor | Remaining proof for final submission |
|---|---|---|
| Technical implementation | Ring device, snapshot and history API client; raw-body HMAC verification; DynamoDB conditional-write idempotency; SQS/DLQ pipeline; Bedrock Converse integration; tested correlation engine | Deploy the included AWS stack, then record a real Ring Playground webhook and a successful Bedrock response |
| Design | Caregiver dashboard, accessible resident mode, metadata-only privacy control, explicit explanation provenance, calm human-in-the-loop actions | Test the final demo route at presentation resolution and 200% text zoom |
| Potential impact | Specific audience of older adults, families and home-care teams; clear visit coordination workflow; usable without biometrics | Add one short quote or validation note from a caregiver/home-care professional |
| Quality of idea | Moves beyond camera viewing into schedule-aware care coordination; privacy-first differentiation; honest uncertainty | State the “context, not surveillance” thesis in the first 20 seconds |
| Ring track compliance | Real Ring imports/entry points and API calls; simulator-compatible signed webhook; public repository published | Final video must visibly demonstrate Ring simulator/device activity |
| AWS Builder | Bedrock, SQS and DynamoDB implemented with official SDKs; deployable CloudFormation includes encryption, TTL, DLQ and least-privilege IAM | Deploy the stack, configure its outputs and capture successful evidence |
| Open Source | Public MIT-licensed repository with reusable Ring webhook/correlation modules: https://github.com/venkatgkasturi/caredoor | Keep the demonstrated revision synchronized with the repository |
| Submission completeness | Devpost draft, friction log, demo script, README, architecture description, live demo and public GitHub URL | Add video URL, final product feedback and exact track selections |

## Non-negotiable final gates

1. Public repository contains the exact demonstrated source and MIT license.
2. A real Ring Playground or device event is visible in the video.
3. Bedrock and SQS are configured and evidenced, not only named.
4. Video is public, in English and under three minutes.
5. Every tool used has specific product feedback.
6. Secrets and personal information are absent from source and video.
