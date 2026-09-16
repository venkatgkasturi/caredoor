# Product feedback and friction log

Update this document while connecting the real staging account. Specific observations are more valuable than generic praise.

| Date | Tool/API | Task attempted | Expected | Actual | Severity | Workaround | Suggested improvement |
|---|---|---|---|---|---|---|---|
| 2026-09-16 | Ring Partner API docs | Design secure webhook ingestion | One canonical signing example and event envelope | Documentation clarified raw-body HMAC and request-ID deduplication | Low | Implemented Web Crypto HMAC over raw bytes | Add copyable examples for Web Crypto/edge runtimes alongside Node and Python |
| 2026-09-16 | Ring Playground | Plan a no-device demo | Simulate motion and button events against the app webhook | Pending staging hookup | TBD | Built a local equivalent simulator for UI reliability | Provide downloadable signed-event fixtures for automated integration tests |
| 2026-09-16 | Amazon Bedrock | Generate safe event explanations | One low-latency constrained sentence from structured facts | Pending credentials/model access | TBD | Deterministic explanation remains available | Document recommended low-latency model choices for short classification explanations |

## Feedback prompts

- What was the first moment the integration became understandable?
- Which setup step took the most retries?
- Was the error message actionable?
- Did the simulator match the production payload closely enough?
- Which capability required an undocumented assumption?
- Would we use this tool again for a production version, and why?
