export type CareAppointment = {
  id: string;
  visitorName: string;
  role: string;
  startsAt: string;
  endsAt: string;
  arrivalWindowMinutes: number;
};

export type DoorActivity = {
  id: string;
  occurredAt: string;
  eventType: string;
  repeatedCount: number;
  windowMinutes: number;
};

export type CorrelationResult =
  | { classification: "expected"; appointment: CareAppointment; minutesFromStart: number; reason: string }
  | { classification: "unmatched"; appointment: null; minutesFromStart: null; reason: string };

export function correlateDoorActivity(activity: DoorActivity, appointments: CareAppointment[]): CorrelationResult {
  const occurredAt = Date.parse(activity.occurredAt);
  if (!Number.isFinite(occurredAt)) throw new Error("Door activity has an invalid timestamp");

  const matches = appointments
    .map((appointment) => {
      const startsAt = Date.parse(appointment.startsAt);
      const endsAt = Date.parse(appointment.endsAt);
      if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt < startsAt) return null;
      const windowMs = Math.max(0, appointment.arrivalWindowMinutes) * 60_000;
      if (occurredAt < startsAt - windowMs || occurredAt > endsAt + windowMs) return null;
      return { appointment, distance: Math.abs(occurredAt - startsAt), minutesFromStart: Math.round((occurredAt - startsAt) / 60_000) };
    })
    .filter((match): match is NonNullable<typeof match> => Boolean(match))
    .sort((left, right) => left.distance - right.distance);

  const match = matches[0];
  if (!match) {
    return {
      classification: "unmatched",
      appointment: null,
      minutesFromStart: null,
      reason: activity.repeatedCount > 1
        ? `No scheduled visit overlaps this event; activity repeated ${activity.repeatedCount} times in ${activity.windowMinutes} minutes.`
        : "No scheduled visit overlaps this event.",
    };
  }

  const offset = match.minutesFromStart === 0
    ? "at the scheduled start time"
    : `${Math.abs(match.minutesFromStart)} minutes ${match.minutesFromStart < 0 ? "before" : "after"} the scheduled start`;
  return {
    classification: "expected",
    appointment: match.appointment,
    minutesFromStart: match.minutesFromStart,
    reason: `Activity occurred ${offset} of ${match.appointment.visitorName}’s ${match.appointment.role} visit.`,
  };
}
