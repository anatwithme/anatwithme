/*
  test-admin-group-CRUD.ts
  Run with: npm run test:admin-group-crud

  Focused regression coverage for real Supabase-backed group CRUD behavior:
    - create group
    - read group
    - update group
    - delete group
*/

import process from "node:process";
import "dotenv/config";
import { createAdminClient } from "./lib/supabase/admin.ts";

type GroupRow = {
  id: string;
  group_name: string;
  preference: "in_person" | "online";
  day_of_week: number | null;
  meet_start_time: string;
  meet_end_time: string;
  room_id: number | null;
  room_overbooked: boolean;
  created_at: string;
};

async function createGroup(input: {
  groupName: string;
  preference: "in_person" | "online";
  dayOfWeek: number;
  meetStartTime: string;
  meetEndTime: string;
}) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("group")
    .insert({
      group_name: input.groupName,
      preference: input.preference,
      day_of_week: input.dayOfWeek,
      meet_start_time: input.meetStartTime,
      meet_end_time: input.meetEndTime,
    })
    .select("id, group_name, preference, day_of_week, meet_start_time, meet_end_time, room_id, room_overbooked, created_at")
    .single<GroupRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create group");
  }

  return data;
}

async function readGroup(groupId: string) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("group")
    .select("id, group_name, preference, day_of_week, meet_start_time, meet_end_time, room_id, room_overbooked, created_at")
    .eq("id", groupId)
    .single<GroupRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

async function updateGroup(
  groupId: string,
  updates: Partial<Pick<GroupRow, "group_name" | "preference" | "day_of_week" | "meet_start_time" | "meet_end_time" | "room_id" | "room_overbooked">>,
) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("group")
    .update(updates)
    .eq("id", groupId)
    .select("id, group_name, preference, day_of_week, meet_start_time, meet_end_time, room_id, room_overbooked, created_at")
    .single<GroupRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update group");
  }

  return data;
}

async function deleteGroup(groupId: string) {
  const supabase = await createAdminClient();

  const { error } = await supabase.from("group").delete().eq("id", groupId);

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

function makeUniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Missing Supabase service role configuration.");
  }

  console.log("\n========================================");
  console.log("  Admin Group CRUD Tests");
  console.log("========================================\n");

  process.exitCode = 0;

  await test("creates a group in the database", async () => {
    const created = await createGroup({
      groupName: `CRUD Test Create ${makeUniqueSuffix()}`,
      preference: "online",
      dayOfWeek: 2,
      meetStartTime: "09:00:00",
      meetEndTime: "10:00:00",
    });

    assert(created.group_name.startsWith("CRUD Test Create"), "Expected the created group name to be stored");
    assert(created.preference === "online", "Expected the created preference to be stored");

    await deleteGroup(created.id);
  });

  await test("reads a previously created group from the database", async () => {
    const created = await createGroup({
      groupName: `CRUD Test Read ${makeUniqueSuffix()}`,
      preference: "in_person",
      dayOfWeek: 4,
      meetStartTime: "10:00:00",
      meetEndTime: "11:00:00",
    });

    try {
      const readBack = await readGroup(created.id);

      assert(readBack !== null, "Expected the created group to be readable");
      assert(readBack?.group_name === created.group_name, "Expected the group name to be preserved");
      assert(readBack?.day_of_week === 4, "Expected the meeting day to be preserved");
    } finally {
      await deleteGroup(created.id);
    }
  });

  await test("updates an existing group in the database", async () => {
    const created = await createGroup({
      groupName: `CRUD Test Update ${makeUniqueSuffix()}`,
      preference: "online",
      dayOfWeek: 1,
      meetStartTime: "11:00:00",
      meetEndTime: "12:00:00",
    });

    try {
      const updated = await updateGroup(created.id, {
        group_name: `${created.group_name} Updated`,
        preference: "in_person",
        day_of_week: 5,
        meet_start_time: "13:00:00",
        meet_end_time: "14:00:00",
      });

      assert(updated.group_name.endsWith("Updated"), "Expected the group name to change");
      assert(updated.preference === "in_person", "Expected the preference to change");
      assert(updated.day_of_week === 5, "Expected the meeting day to change");
    } finally {
      await deleteGroup(created.id);
    }
  });

  await test("deletes an existing group from the database", async () => {
    const created = await createGroup({
      groupName: `CRUD Test Delete ${makeUniqueSuffix()}`,
      preference: "online",
      dayOfWeek: 3,
      meetStartTime: "15:00:00",
      meetEndTime: "16:00:00",
    });

    const deleted = await deleteGroup(created.id);
    const readBack = await readGroup(created.id);

    assert(deleted, "Expected the group to be deleted");
    assert(readBack === null, "Expected the deleted group to be removed");
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
