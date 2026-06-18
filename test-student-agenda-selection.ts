import { getDefaultAgendaId } from "./lib/agenda-selection.ts";

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

const agendas = [
  { id: 1, start_date: "2026-06-10", end_date: "2026-06-16" },
  { id: 2, start_date: "2026-06-17", end_date: "2026-06-23" },
  { id: 3, start_date: "2026-06-24", end_date: "2026-06-30" },
];

const agendaSummaries = [
  { id: 1, totalTasks: 5, studentProgressPercent: 100 },
  { id: 2, totalTasks: 5, studentProgressPercent: 0 },
  { id: 3, totalTasks: 0, studentProgressPercent: 0 },
];

console.log("\n========================================");
console.log("  Student Agenda Selection Tests");
console.log("========================================\n");

test("selects the current agenda when today falls inside its date range", () => {
  const selectedAgendaId = getDefaultAgendaId({
    agendas,
    agendaSummaries,
    requestedAgendaId: NaN,
    today: "2026-06-18",
  });

  assert(
    selectedAgendaId === 2,
    `Expected agenda 2 for the current week, got ${selectedAgendaId}`,
  );
});

test("keeps an explicit agenda selection even when another agenda is current", () => {
  const selectedAgendaId = getDefaultAgendaId({
    agendas,
    agendaSummaries,
    requestedAgendaId: 1,
    today: "2026-06-18",
  });

  assert(
    selectedAgendaId === 1,
    `Expected explicit selection of agenda 1, got ${selectedAgendaId}`,
  );
});

console.log("\n========================================");
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log("========================================\n");

if (failed > 0) {
  process.exitCode = 1;
}
