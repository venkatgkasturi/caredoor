import test from "node:test";
import assert from "node:assert/strict";
import { correlateDoorActivity, type CareAppointment } from "../lib/correlation.ts";

const appointments: CareAppointment[] = [{
  id: "visit-maria",
  visitorName: "Maria",
  role: "home-care",
  startsAt: "2026-09-16T14:00:00-04:00",
  endsAt: "2026-09-16T15:00:00-04:00",
  arrivalWindowMinutes: 15,
}];

test("matches an arrival inside the configured care-visit window", () => {
  const result = correlateDoorActivity({ id: "event-1", occurredAt: "2026-09-16T13:58:00-04:00", eventType: "motion.human", repeatedCount: 1, windowMinutes: 1 }, appointments);
  assert.equal(result.classification, "expected");
  assert.equal(result.appointment?.visitorName, "Maria");
  assert.equal(result.minutesFromStart, -2);
  assert.match(result.reason, /2 minutes before/);
});

test("keeps a late-night repeated event unmatched", () => {
  const result = correlateDoorActivity({ id: "event-2", occurredAt: "2026-09-16T23:42:00-04:00", eventType: "motion.human", repeatedCount: 3, windowMinutes: 6 }, appointments);
  assert.equal(result.classification, "unmatched");
  assert.equal(result.appointment, null);
  assert.match(result.reason, /repeated 3 times in 6 minutes/);
});

test("chooses the closest visit when windows overlap", () => {
  const second = { ...appointments[0], id: "visit-alex", visitorName: "Alex", startsAt: "2026-09-16T14:10:00-04:00" };
  const result = correlateDoorActivity({ id: "event-3", occurredAt: "2026-09-16T14:08:00-04:00", eventType: "button_press", repeatedCount: 1, windowMinutes: 1 }, [appointments[0], second]);
  assert.equal(result.classification, "expected");
  assert.equal(result.appointment?.visitorName, "Alex");
});

test("rejects malformed event timestamps", () => {
  assert.throws(() => correlateDoorActivity({ id: "event-4", occurredAt: "not-a-date", eventType: "motion", repeatedCount: 1, windowMinutes: 1 }, appointments), /invalid timestamp/);
});
