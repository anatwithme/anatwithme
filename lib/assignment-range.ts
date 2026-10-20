import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const ASSIGNMENT_TIME_ZONE = "America/New_York";

export const ASSIGNMENT_BOTH_DATES_MESSAGE =
  "Please enter both assignment dates.";

export const ASSIGNMENT_END_AFTER_START_MESSAGE =
  "Assignment end must be after assignment start.";

export const ASSIGNMENT_UNPARSEABLE_MESSAGE =
  "Enter a valid assignment start and end.";

export type AssignmentRangeInput = {
  preference: "in_person" | "online";
  assignmentStart?: string | null;
  assignmentEnd?: string | null;
};

export type StoredAssignmentRange = {
  assignmentStart: string | null;
  assignmentEnd: string | null;
};

type ResolvedAssignmentRange =
  | {
      ok: true;
      provided: boolean;
      assignmentStart: string | null;
      assignmentEnd: string | null;
    }
  | { ok: false; error: string };

const WALL_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;

function isBlank(value: string | null | undefined) {
  return value == null || value.trim() === "";
}

function parseAssignmentInstant(value: string): Date | null {
  const trimmed = value.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);

  if (hasZone) {
    const instant = new Date(trimmed);
    return Number.isNaN(instant.getTime()) ? null : instant;
  }

  const match = WALL_TIME_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const normalized = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] ?? "00"}`;
  const instant = fromZonedTime(normalized, ASSIGNMENT_TIME_ZONE);

  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  const roundTrip = formatInTimeZone(
    instant,
    ASSIGNMENT_TIME_ZONE,
    "yyyy-MM-dd'T'HH:mm:ss",
  );

  return roundTrip === normalized ? instant : null;
}

function resolveAssignmentRange(
  input: AssignmentRangeInput,
): ResolvedAssignmentRange {
  if (input.preference === "online") {
    return {
      ok: true,
      provided: true,
      assignmentStart: null,
      assignmentEnd: null,
    };
  }

  const startMissing = isBlank(input.assignmentStart);
  const endMissing = isBlank(input.assignmentEnd);
  const startOmitted = input.assignmentStart === undefined;
  const endOmitted = input.assignmentEnd === undefined;

  if (startMissing && endMissing) {
    return {
      ok: true,
      provided: !(startOmitted && endOmitted),
      assignmentStart: null,
      assignmentEnd: null,
    };
  }

  if (startMissing || endMissing) {
    return { ok: false, error: ASSIGNMENT_BOTH_DATES_MESSAGE };
  }

  const start = parseAssignmentInstant(input.assignmentStart ?? "");
  const end = parseAssignmentInstant(input.assignmentEnd ?? "");

  if (!start || !end) {
    return { ok: false, error: ASSIGNMENT_UNPARSEABLE_MESSAGE };
  }

  if (end.getTime() <= start.getTime()) {
    return { ok: false, error: ASSIGNMENT_END_AFTER_START_MESSAGE };
  }

  return {
    ok: true,
    provided: true,
    assignmentStart: start.toISOString(),
    assignmentEnd: end.toISOString(),
  };
}

export function persistableAssignmentRange(
  input: AssignmentRangeInput,
  existing?: StoredAssignmentRange | null,
):
  | { ok: true; assignmentStart: string | null; assignmentEnd: string | null }
  | { ok: false; error: string } {
  const resolved = resolveAssignmentRange(input);

  if (!resolved.ok) {
    return resolved;
  }

  if (
    !resolved.provided &&
    input.preference === "in_person" &&
    existing
  ) {
    return {
      ok: true,
      assignmentStart: existing.assignmentStart,
      assignmentEnd: existing.assignmentEnd,
    };
  }

  return {
    ok: true,
    assignmentStart: resolved.assignmentStart,
    assignmentEnd: resolved.assignmentEnd,
  };
}

function storedInstant(value: string | null | undefined) {
  if (value == null || value.trim() === "") {
    return null;
  }

  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function assignmentRangesOverlap(
  leftStart: string | null | undefined,
  leftEnd: string | null | undefined,
  rightStart: string | null | undefined,
  rightEnd: string | null | undefined,
) {
  const leftStartInstant = storedInstant(leftStart);
  const leftEndInstant = storedInstant(leftEnd);
  const rightStartInstant = storedInstant(rightStart);
  const rightEndInstant = storedInstant(rightEnd);

  if (
    !leftStartInstant ||
    !leftEndInstant ||
    !rightStartInstant ||
    !rightEndInstant
  ) {
    return true;
  }

  return (
    leftStartInstant < rightEndInstant &&
    rightStartInstant < leftEndInstant
  );
}
