/*
  test-admin-agenda-CRUD.ts
  Run with: npm run test:admin-agenda-crud

  Focused regression coverage for basic agenda item CRUD behavior:
    - create agenda item
    - read agenda item
    - update agenda item
    - delete agenda item
*/

type AgendaItem = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  startDate: string;
  endDate: string;
  enabled: boolean;
  unitValue: number | null;
};

type AgendaStore = AgendaItem[];

function createAgendaItem(store: AgendaStore, item: Omit<AgendaItem, "id">): AgendaItem {
  const created: AgendaItem = {
    id: store.length > 0 ? Math.max(...store.map((entry) => entry.id)) + 1 : 1,
    ...item,
  };

  store.push(created);
  return created;
}

function readAgendaItem(store: AgendaStore, id: number): AgendaItem | undefined {
  return store.find((item) => item.id === id);
}

function updateAgendaItem(
  store: AgendaStore,
  id: number,
  updates: Partial<Omit<AgendaItem, "id">>,
): AgendaItem | undefined {
  const target = readAgendaItem(store, id);

  if (!target) {
    return undefined;
  }

  Object.assign(target, updates);
  return target;
}

function deleteAgendaItem(store: AgendaStore, id: number): boolean {
  const index = store.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  store.splice(index, 1);
  return true;
}

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
console.log("  Admin Agenda CRUD Tests");
console.log("========================================\n");

test("creates an agenda item and stores it in the collection", () => {
  const store: AgendaStore = [];
  const created = createAgendaItem(store, {
    title: "Week 1",
    description: "Intro week",
    week: 1,
    startDate: "2026-06-01",
    endDate: "2026-06-07",
    enabled: true,
    unitValue: 1,
  });

  assert(store.length === 1, "Expected one agenda item to be created");
  assert(created.id === 1, "Expected the first created item to receive id 1");
  assert(created.title === "Week 1", "Expected the created item title to be preserved");
});

test("reads a previously created agenda item by id", () => {
  const store: AgendaStore = [];
  const created = createAgendaItem(store, {
    title: "Week 2",
    description: null,
    week: 2,
    startDate: "2026-06-08",
    endDate: "2026-06-14",
    enabled: false,
    unitValue: null,
  });

  const readBack = readAgendaItem(store, created.id);

  assert(readBack !== undefined, "Expected the created agenda item to be readable");
  assert(readBack?.week === 2, "Expected the read item to preserve its week value");
  assert(readBack?.enabled === false, "Expected the read item to preserve its enabled flag");
});

test("updates an existing agenda item", () => {
  const store: AgendaStore = [];
  const created = createAgendaItem(store, {
    title: "Week 3",
    description: "Before update",
    week: 3,
    startDate: "2026-06-15",
    endDate: "2026-06-21",
    enabled: true,
    unitValue: 2,
  });

  const updated = updateAgendaItem(store, created.id, {
    title: "Week 3 Updated",
    description: "After update",
    enabled: false,
  });

  assert(updated !== undefined, "Expected the agenda item to be updated");
  assert(updated?.title === "Week 3 Updated", "Expected the title to change");
  assert(updated?.description === "After update", "Expected the description to change");
  assert(updated?.enabled === false, "Expected the enabled flag to change");
});

test("deletes an existing agenda item", () => {
  const store: AgendaStore = [];
  const created = createAgendaItem(store, {
    title: "Week 4",
    description: "Delete me",
    week: 4,
    startDate: "2026-06-22",
    endDate: "2026-06-28",
    enabled: true,
    unitValue: 3,
  });

  const deleted = deleteAgendaItem(store, created.id);
  const readBack = readAgendaItem(store, created.id);

  assert(deleted, "Expected the agenda item to be deleted");
  assert(readBack === undefined, "Expected the deleted agenda item to be removed");
  assert(store.length === 0, "Expected the collection to be empty after deletion");
});

console.log("\n========================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("  All tests passed!");
} else {
  console.log(`  ${failed} test(s) need attention.`);
}
console.log("========================================\n");

if (failed > 0) {
  process.exitCode = 1;
}
