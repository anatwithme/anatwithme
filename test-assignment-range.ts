/*
  test-assignment-range.ts
  Run with: npm run test:assignment-range

  Coverage for meeting-room assignment date ranges:
    - optional ranges
    - one-sided and unparseable values
    - end strictly after start
    - America/New_York wall times stored as UTC
    - online groups clear dates
    - omitted dates on edit keep the stored range
    - overlap, touching endpoints, and null ranges
*/

import { assignRoomsToGroups } from "./lib/room-assignment.ts";
import {
  ASSIGNMENT_BOTH_DATES_MESSAGE,
  ASSIGNMENT_END_AFTER_START_MESSAGE,
  ASSIGNMENT_UNPARSEABLE_MESSAGE,
  assignmentRangesOverlap,
  persistableAssignmentRange,
} from "./lib/assignment-range.ts";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error: unknown) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

console.log("\n========================================");
console.log("  Assignment Range Tests");
console.log("========================================\n");

test("omits the range when both dates are absent", () => {
  const created = persistableAssignmentRange({
    preference: "in_person",
  });

  assert(created.ok, "Expected a valid omitted range");
  assert(created.assignmentStart === null, "Expected a null start");
  assert(created.assignmentEnd === null, "Expected a null end");
});

test("clears the range when both dates are blank", () => {
  const cleared = persistableAssignmentRange(
    {
      preference: "in_person",
      assignmentStart: "  ",
      assignmentEnd: "",
    },
    {
      assignmentStart: "2026-03-01T15:00:00.000Z",
      assignmentEnd: "2026-04-01T15:00:00.000Z",
    },
  );

  assert(cleared.ok, "Expected a cleared range");
  assert(cleared.assignmentStart === null, "Expected the stored start to clear");
  assert(cleared.assignmentEnd === null, "Expected the stored end to clear");
});

test("rejects a one-sided range", () => {
  const result = persistableAssignmentRange({
    preference: "in_person",
    assignmentStart: "2026-03-02T10:00",
    assignmentEnd: null,
  });

  assert(!result.ok, "Expected a one-sided range to fail");
  assert(result.error === ASSIGNMENT_BOTH_DATES_MESSAGE, result.error);
});

test("rejects an unparseable range", () => {
  const result = persistableAssignmentRange({
    preference: "in_person",
    assignmentStart: "tomorrow",
    assignmentEnd: "2026-03-02T11:00",
  });

  assert(!result.ok, "Expected an unparseable range to fail");
  assert(result.error === ASSIGNMENT_UNPARSEABLE_MESSAGE, result.error);
});

test("rejects an end that is not strictly later", () => {
  const equal = persistableAssignmentRange({
    preference: "in_person",
    assignmentStart: "2026-03-02T10:00",
    assignmentEnd: "2026-03-02T10:00",
  });
  const earlier = persistableAssignmentRange({
    preference: "in_person",
    assignmentStart: "2026-03-02T11:00",
    assignmentEnd: "2026-03-02T10:00",
  });

  assert(!equal.ok && equal.error === ASSIGNMENT_END_AFTER_START_MESSAGE, "Expected equal instants to fail");
  assert(!earlier.ok && earlier.error === ASSIGNMENT_END_AFTER_START_MESSAGE, "Expected an earlier end to fail");
});

test("stores Eastern wall times as UTC", () => {
  const winter = persistableAssignmentRange({
    preference: "in_person",
    assignmentStart: "2026-01-15T10:00",
    assignmentEnd: "2026-01-15T11:00",
  });
  const summer = persistableAssignmentRange({
    preference: "in_person",
    assignmentStart: "2026-07-15T10:00",
    assignmentEnd: "2026-07-15T11:00",
  });

  assert(winter.ok, "Expected the January range to parse");
  assert(summer.ok, "Expected the July range to parse");
  assert(winter.assignmentStart === "2026-01-15T15:00:00.000Z", winter.assignmentStart ?? "");
  assert(winter.assignmentEnd === "2026-01-15T16:00:00.000Z", winter.assignmentEnd ?? "");
  assert(summer.assignmentStart === "2026-07-15T14:00:00.000Z", summer.assignmentStart ?? "");
  assert(summer.assignmentEnd === "2026-07-15T15:00:00.000Z", summer.assignmentEnd ?? "");
});

test("accepts an absolute timestamp and keeps that instant", () => {
  const result = persistableAssignmentRange({
    preference: "in_person",
    assignmentStart: "2026-03-02T15:00:00.000Z",
    assignmentEnd: "2026-03-02T16:00:00.000Z",
  });

  assert(result.ok, "Expected an absolute range to parse");
  assert(result.assignmentStart === "2026-03-02T15:00:00.000Z", result.assignmentStart ?? "");
  assert(result.assignmentEnd === "2026-03-02T16:00:00.000Z", result.assignmentEnd ?? "");
});

test("clears dates for an online group", () => {
  const result = persistableAssignmentRange({
    preference: "online",
    assignmentStart: "2026-03-02T10:00",
    assignmentEnd: "2026-03-02T11:00",
  });

  assert(result.ok, "Expected online dates to be cleared");
  assert(result.assignmentStart === null, "Expected a null online start");
  assert(result.assignmentEnd === null, "Expected a null online end");
});

test("keeps the stored range when an edit omits dates", () => {
  const result = persistableAssignmentRange(
    { preference: "in_person" },
    {
      assignmentStart: "2026-03-01T15:00:00.000Z",
      assignmentEnd: "2026-04-01T15:00:00.000Z",
    },
  );

  assert(result.ok, "Expected the stored range to remain");
  assert(result.assignmentStart === "2026-03-01T15:00:00.000Z", "Expected the existing start");
  assert(result.assignmentEnd === "2026-04-01T15:00:00.000Z", "Expected the existing end");
});

test("treats a null range as overlapping every range", () => {
  assert(
    assignmentRangesOverlap(null, null, "2026-03-01T15:00:00.000Z", "2026-04-01T15:00:00.000Z"),
    "Expected a null range to overlap a dated range",
  );
  assert(assignmentRangesOverlap(null, null, null, null), "Expected null ranges to overlap");
});

test("treats touching endpoints as disjoint", () => {
  assert(
    !assignmentRangesOverlap(
      "2026-03-01T15:00:00.000Z",
      "2026-04-01T15:00:00.000Z",
      "2026-04-01T15:00:00.000Z",
      "2026-05-01T15:00:00.000Z",
    ),
    "Expected touching ranges to stay disjoint",
  );
});

test("detects real overlap and ignores disjoint ranges", () => {
  assert(
    assignmentRangesOverlap(
      "2026-03-01T15:00:00.000Z",
      "2026-04-15T15:00:00.000Z",
      "2026-04-01T15:00:00.000Z",
      "2026-05-01T15:00:00.000Z",
    ),
    "Expected overlapping ranges to conflict",
  );
  assert(
    !assignmentRangesOverlap(
      "2026-03-01T15:00:00.000Z",
      "2026-04-01T15:00:00.000Z",
      "2026-04-02T15:00:00.000Z",
      "2026-05-01T15:00:00.000Z",
    ),
    "Expected a gap to stay disjoint",
  );
});

test("dated usage does not consume capacity when the caller filters it out", () => {
  const rooms = [
    {
      id: 1,
      building: "Scott",
      roomNumber: "101",
      groupCapacity: 1,
      availableDays: [0],
    },
  ];
  const existing = {
    roomId: 1,
    dayOfWeek: 0,
    meetStartTime: "09:00:00",
    assignmentStart: "2026-03-01T15:00:00.000Z",
    assignmentEnd: "2026-04-01T15:00:00.000Z",
  };
  const candidateStart = "2026-05-01T14:00:00.000Z";
  const candidateEnd = "2026-06-01T14:00:00.000Z";
  const usage = assignmentRangesOverlap(
    existing.assignmentStart,
    existing.assignmentEnd,
    candidateStart,
    candidateEnd,
  )
    ? [existing]
    : [];

  const result = assignRoomsToGroups(
    [{ preference: "in_person", dayOfWeek: 0, meetStartTime: "09:00:00" }],
    rooms,
    usage,
    false,
  );

  assert(result.assignments[0]?.roomId === 1, "Expected the disjoint group to take the room");
  assert(result.assignments[0]?.overbooked === false, "Expected no overbook");
});

console.log("\n========================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("  SOME TESTS FAILED");
  process.exit(1);
}
console.log("  All tests passed!");
console.log("========================================\n");
