export const SLOTS_PER_DAY = 16;
export const DAY_START_HOUR = 7;

export const IN_PERSON_FIRST_WEEKDAY = 0;
export const IN_PERSON_LAST_WEEKDAY = 4;
export const IN_PERSON_LAST_START_HOUR = 19;
export const ONLINE_LAST_START_HOUR = 22;

export const IN_PERSON_SCHEDULE_ERROR =
  "In-person groups must be scheduled Monday through Friday, 7:00 AM to 7:00 PM.";

export const ONLINE_SCHEDULE_ERROR =
  "Online groups must be scheduled any day from 7:00 AM to 10:00 PM.";

export type ScheduledPreference = "in_person" | "online";

export function weekdaysForPreference(preference: ScheduledPreference): number[] {
  if (preference === "in_person") {
    return [0, 1, 2, 3, 4];
  }

  return [0, 1, 2, 3, 4, 5, 6];
}

export function startTimesForPreference(preference: ScheduledPreference): string[] {
  const lastHour =
    preference === "in_person" ? IN_PERSON_LAST_START_HOUR : ONLINE_LAST_START_HOUR;
  const times: string[] = [];

  for (let hour = DAY_START_HOUR; hour <= lastHour; hour++) {
    times.push(`${String(hour).padStart(2, "0")}:00`);
  }

  return times;
}

export function isStartAllowedForPreference(
  dayOfWeek: number,
  startHour: number,
  preference: ScheduledPreference,
): boolean {
  if (!Number.isInteger(dayOfWeek) || !Number.isInteger(startHour)) {
    return false;
  }

  if (preference === "online") {
    return (
      dayOfWeek >= 0 &&
      dayOfWeek <= 6 &&
      startHour >= DAY_START_HOUR &&
      startHour <= ONLINE_LAST_START_HOUR
    );
  }

  return (
    dayOfWeek >= IN_PERSON_FIRST_WEEKDAY &&
    dayOfWeek <= IN_PERSON_LAST_WEEKDAY &&
    startHour >= DAY_START_HOUR &&
    startHour <= IN_PERSON_LAST_START_HOUR
  );
}

export function isSlotAllowedForPreference(
  slotIndex: number,
  preference: ScheduledPreference,
): boolean {
  if (!Number.isInteger(slotIndex) || slotIndex < 0) {
    return false;
  }

  const day = Math.floor(slotIndex / SLOTS_PER_DAY);
  const position = slotIndex % SLOTS_PER_DAY;

  if (day > 6 || position > 15) {
    return false;
  }

  return isStartAllowedForPreference(day, DAY_START_HOUR + position, preference);
}

export function meetingEndTime(meetStartTime: string): string {
  const hour = Number.parseInt(meetStartTime.slice(0, 2), 10);
  if (!Number.isInteger(hour)) {
    return meetStartTime;
  }

  return `${String(hour + 1).padStart(2, "0")}:00:00`;
}

export function clampMeetingSchedule(
  dayOfWeek: number,
  meetStartTime: string,
  preference: ScheduledPreference,
): { dayOfWeek: number; meetStartTime: string; meetEndTime: string } {
  const days = weekdaysForPreference(preference);
  const times = startTimesForPreference(preference);
  const currentTime = meetStartTime.slice(0, 5);
  const nextStartTime = `${times.includes(currentTime) ? currentTime : times[times.length - 1]}:00`;

  return {
    dayOfWeek: days.includes(dayOfWeek) ? dayOfWeek : days[0],
    meetStartTime: nextStartTime,
    meetEndTime: meetingEndTime(nextStartTime),
  };
}
