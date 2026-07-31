/*
  Supabase-backed Admin Resources CRUD tests
  Run with: npm run test:admin-resources-crud

  Covers resource CRUD behavior for the admin resources page,
  including the related section/task rows that back the page UI.
*/

import process from "node:process";
import "dotenv/config";
import { createAdminClient } from "./lib/supabase/admin.ts";

type ResourceRow = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  start_date: string;
  end_date: string;
  enabled: boolean;
};

type SectionRow = {
  id: number;
  agenda_id: number;
  title: string;
  description: string | null;
  type: string;
  order: number | null;
};

type TaskRow = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

async function createResource(input: {
  title: string;
  description: string | null;
  week: number;
}) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("agenda")
    .insert({
      title: input.title,
      description: input.description,
      week: input.week,
      start_date: "2026-07-01",
      end_date: "2026-07-31",
      enabled: true,
    })
    .select("id, title, description, week, start_date, end_date, enabled")
    .single<ResourceRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create resource");
  }

  return data;
}

async function readResource(resourceId: number) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("agenda")
    .select("id, title, description, week, start_date, end_date, enabled")
    .eq("id", resourceId)
    .single<ResourceRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

async function updateResource(
  resourceId: number,
  updates: Partial<Pick<ResourceRow, "title" | "description" | "enabled">>,
) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("agenda")
    .update(updates)
    .eq("id", resourceId)
    .select("id, title, description, week, start_date, end_date, enabled")
    .single<ResourceRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update resource");
  }

  return data;
}

async function deleteResource(resourceId: number) {
  const supabase = await createAdminClient();

  const { error } = await supabase.from("agenda").delete().eq("id", resourceId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

async function createSection(resourceId: number, input: { title: string; description: string | null; order: number | null }) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("section")
    .insert({
      agenda_id: resourceId,
      title: input.title,
      description: input.description,
      type: "group",
      order: input.order,
    })
    .select("id, agenda_id, title, description, type, \"order\"")
    .single<SectionRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create section");
  }

  return data;
}

async function createTask(sectionId: number, input: { title: string; description: string | null; link: string | null; order: number | null }) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("task")
    .insert({
      section_id: sectionId,
      title: input.title,
      description: input.description,
      link: input.link,
      order: input.order,
    })
    .select("id, section_id, title, description, link, \"order\"")
    .single<TaskRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create task");
  }

  return data;
}

async function readSection(resourceId: number) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("section")
    .select("id, agenda_id, title, description, type, \"order\"")
    .eq("agenda_id", resourceId)
    .single<SectionRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

async function readTask(sectionId: number) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("task")
    .select("id, section_id, title, description, link, \"order\"")
    .eq("section_id", sectionId)
    .single<TaskRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
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
  console.log("  Admin Resources CRUD Tests");
  console.log("========================================\n");

  await test("creates a resource and its related section/task in the database", async () => {
    const created = await createResource({
      title: `Resource Create ${makeUniqueSuffix()}`,
      description: "Initial resource",
      week: -1000001 - Math.floor(Math.random() * 1000),
    });

    const createdSection = await createSection(created.id, {
      title: "Getting Started",
      description: "Intro section",
      order: 1,
    });

    const createdTask = await createTask(createdSection.id, {
      title: "Read the overview",
      description: "Open the overview document",
      link: "https://example.com/overview",
      order: 1,
    });

    assert(created.title.startsWith("Resource Create"), "Expected the created resource title to be stored");
    assert(createdSection.title === "Getting Started", "Expected the created section title to be stored");
    assert(createdTask.title === "Read the overview", "Expected the created task title to be stored");

    await deleteResource(created.id);
  });

  await test("reads a previously created resource and its related rows from the database", async () => {
    const created = await createResource({
      title: `Resource Read ${makeUniqueSuffix()}`,
      description: null,
      week: -2000001 - Math.floor(Math.random() * 1000),
    });

    try {
      const createdSection = await createSection(created.id, {
        title: "Resources",
        description: null,
        order: 2,
      });

      await createTask(createdSection.id, {
        title: "Watch the walkthrough",
        description: null,
        link: null,
        order: 2,
      });

      const readBack = await readResource(created.id);
      const readSectionBack = await readSection(created.id);
      const readTaskBack = await readTask(createdSection.id);

      assert(readBack !== null, "Expected the created resource to be readable");
      assert(readBack?.title === created.title, "Expected the resource title to be preserved");
      assert(readSectionBack?.title === "Resources", "Expected the section to be preserved");
      assert(readTaskBack?.title === "Watch the walkthrough", "Expected the task to be preserved");
    } finally {
      await deleteResource(created.id);
    }
  });

  await test("updates an existing resource and its related rows in the database", async () => {
    const created = await createResource({
      title: `Resource Update ${makeUniqueSuffix()}`,
      description: "Before update",
      week: -3000001 - Math.floor(Math.random() * 1000),
    });

    try {
      const createdSection = await createSection(created.id, {
        title: "Before Update",
        description: "Before update",
        order: 3,
      });

      await createTask(createdSection.id, {
        title: "Before task update",
        description: "Before task details",
        link: "https://example.com/before",
        order: 3,
      });

      const updated = await updateResource(created.id, {
        title: `${created.title} Updated`,
        description: "After update",
        enabled: false,
      });

      assert(updated.title.endsWith("Updated"), "Expected the resource title to change");
      assert(updated.description === "After update", "Expected the resource description to change");
      assert(updated.enabled === false, "Expected the enabled flag to change");
    } finally {
      await deleteResource(created.id);
    }
  });

  await test("deletes an existing resource and removes its related rows from the database", async () => {
    const created = await createResource({
      title: `Resource Delete ${makeUniqueSuffix()}`,
      description: "Delete me",
      week: -4000001 - Math.floor(Math.random() * 1000),
    });

    const createdSection = await createSection(created.id, {
      title: "Delete Section",
      description: null,
      order: 4,
    });

    await createTask(createdSection.id, {
      title: "Delete task",
      description: null,
      link: null,
      order: 4,
    });

    const deleted = await deleteResource(created.id);
    const readBack = await readResource(created.id);
    const readSectionBack = await readSection(created.id);
    const readTaskBack = await readTask(createdSection.id);

    assert(deleted, "Expected the resource to be deleted");
    assert(readBack === null, "Expected the deleted resource to be removed");
    assert(readSectionBack === null, "Expected the deleted resource section to be removed");
    assert(readTaskBack === null, "Expected the deleted resource task to be removed");
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
