/*
  Supabase-backed Admin Agenda CRUD tests
  Moved here from test-admin-group-CRUD.ts
  Run with: npm run test:admin-agenda-crud
*/

import process from "node:process";
import "dotenv/config";
import { createAdminClient } from "./lib/supabase/admin.ts";

type AgendaRow = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  start_date: string;
  end_date: string;
  enabled: boolean;
  unitValue: number | null;
};

async function createAgendaItem(input: {
  title: string;
  description: string | null;
  week: number;
  startDate: string;
  endDate: string;
  enabled: boolean;
  unitValue: number | null;
}) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("agenda")
    .insert({
      title: input.title,
      description: input.description,
      week: input.week,
      start_date: input.startDate,
      end_date: input.endDate,
      enabled: input.enabled,
      unitValue: input.unitValue,
    })
    .select("id, title, description, week, start_date, end_date, enabled, unitValue")
    .single<AgendaRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create agenda item");
  }

  return data;
}

async function readAgendaItem(agendaId: number) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("agenda")
    .select("id, title, description, week, start_date, end_date, enabled, unitValue")
    .eq("id", agendaId)
    .single<AgendaRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

async function updateAgendaItem(
  agendaId: number,
  updates: Partial<Pick<AgendaRow, "title" | "description" | "week" | "start_date" | "end_date" | "enabled" | "unitValue">>,
) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("agenda")
    .update(updates)
    .eq("id", agendaId)
    .select("id, title, description, week, start_date, end_date, enabled, unitValue")
    .single<AgendaRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update agenda item");
  }

  return data;
}

async function deleteAgendaItem(agendaId: number) {
  const supabase = await createAdminClient();

  const { error } = await supabase.from("agenda").delete().eq("id", agendaId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error: unknown) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service role configuration.");
  }

  console.log("\n========================================");
  console.log("  Admin Agenda CRUD Tests");
  console.log("========================================\n");

  await test("creates an agenda item in the database", async () => {
    const created = await createAgendaItem({
      title: "Week 1",
      description: "Intro week",
      week: 1000001,
      startDate: "2026-06-01",
      endDate: "2026-06-07",
      enabled: true,
      unitValue: 1,
    });

    assert(created.title === "Week 1", "Expected the created agenda title to be stored");
    assert(created.enabled === true, "Expected the created agenda enabled flag to be stored");

    await deleteAgendaItem(created.id);
  });

  await test("reads a previously created agenda item from the database", async () => {
    const created = await createAgendaItem({
      title: "Week 2",
      description: null,
      week: 1000002,
      startDate: "2026-06-08",
      endDate: "2026-06-14",
      enabled: false,
      unitValue: null,
    });

    try {
      const readBack = await readAgendaItem(created.id);

      assert(readBack !== null, "Expected the created agenda item to be readable");
      assert(readBack?.title === "Week 2", "Expected the read agenda title to be preserved");
      assert(readBack?.enabled === false, "Expected the read agenda enabled flag to be preserved");
    } finally {
      await deleteAgendaItem(created.id);
    }
  });

  await test("updates an existing agenda item in the database", async () => {
    const created = await createAgendaItem({
      title: "Week 3",
      description: "Before update",
      week: 1000003,
      startDate: "2026-06-15",
      endDate: "2026-06-21",
      enabled: true,
      unitValue: 2,
    });

    try {
      const updated = await updateAgendaItem(created.id, {
        title: "Week 3 Updated",
        description: "After update",
        enabled: false,
        unitValue: 3,
      });

      assert(updated.title === "Week 3 Updated", "Expected the agenda title to change");
      assert(updated.description === "After update", "Expected the agenda description to change");
      assert(updated.enabled === false, "Expected the enabled flag to change");
    } finally {
      await deleteAgendaItem(created.id);
    }
  });

  await test("deletes an existing agenda item from the database", async () => {
    const created = await createAgendaItem({
      title: "Week 4",
      description: "Delete me",
      week: 1000004,
      startDate: "2026-06-22",
      endDate: "2026-06-28",
      enabled: true,
      unitValue: 4,
    });

    const deleted = await deleteAgendaItem(created.id);
    const readBack = await readAgendaItem(created.id);

    assert(deleted, "Expected the agenda item to be deleted");
    assert(readBack === null, "Expected the deleted agenda item to be removed");
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
}

void main();
