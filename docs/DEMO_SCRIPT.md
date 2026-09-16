# CareDoor three-minute demo script

Target length: 2:35–2:45. Leave margin because judges are not required to watch past three minutes.

## 0:00–0:18 — The problem

**Screen:** CareDoor dashboard, no interaction yet.

**Narration:** “A Ring alert can tell Daniel that someone is at his mother’s door. It cannot tell him whether the person fits her care schedule, whether she understood the alert, or whether he needs to step in. CareDoor adds that missing caregiving context.”

## 0:18–0:53 — Expected caregiver

**Action:** Open **Run Ring demo** and select **Expected caregiver**.

**Narration:** “Ring detects a person two minutes before Maria’s scheduled visit. CareDoor correlates the event with the care calendar. It does not use facial recognition or claim this is Maria—it says she may have arrived and explains the schedule match.”

**Action:** Select **Expected**.

**Narration:** “Daniel confirms the arrival, preserving a human decision.”

## 0:53–1:30 — Unmatched event

**Action:** Select **Run Ring demo → Late-night visitor**.

**Narration:** “At 11:42 PM, three motion events arrive within six minutes with no scheduled visit. CareDoor surfaces the observable facts without labeling the visitor dangerous.”

**Screen:** Pause on the explanation source label.

**Narration:** “Amazon Bedrock turns structured facts into one calm sentence under a prompt that prohibits identity guesses and emergency claims. If Bedrock is unavailable, CareDoor falls back to deterministic safety rules.”

## 1:30–1:52 — Privacy and accessibility

**Action:** Enable **Metadata only**.

**Narration:** “The entire matching workflow can run without requesting an image.”

**Action:** Open **Preview resident view**.

**Narration:** “The resident receives a large-type, low-cognitive-load message with two clear actions.”

## 1:52–2:25 — Real implementation

**Screen:** Show a concise architecture slide or repository view.

**Narration:** “Ring delivers a signed webhook. CareDoor verifies the HMAC over the exact raw bytes, rejects tampering, deduplicates the request ID, and publishes a normalized event to Amazon SQS. It uses Ring device discovery, snapshots and event history, then calls Amazon Bedrock for the explanation.”

**Screen:** Briefly show passing webhook and correlation tests.

**Narration:** “The security boundary, duplicate handling and schedule matching are covered by executable tests.”

## 2:25–2:43 — Impact

**Screen:** Return to the dashboard and care circle.

**Narration:** “CareDoor is for families, home-care teams and older adults who need context—not more surveillance. Care starts at the doorstep.”

## Recording checklist

- Browser at 1440×900 or 1920×1080 with notifications hidden.
- Use the expected scenario first, then unmatched; reset before recording.
- Keep cursor movement deliberate and avoid scrolling where possible.
- Show a real Ring Playground delivery in the implementation section.
- Display no credentials, account IDs, private URLs or personal information.
- Use voice only or copyright-safe audio.
- Export under 2:50 and watch the final file once at normal speed.
