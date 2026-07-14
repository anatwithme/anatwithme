"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  return supabase;
}

function revalidateResourcePaths(resourceId?: number) {
  revalidatePath("/admin/resources");
  revalidatePath("/student/resources");
  if (resourceId) {
    revalidatePath(`/admin/resources/${resourceId}`);
  }
}

export async function createResource(title: string, description: string | null) {
  const supabase = await getAuthenticatedSupabase();

  const week = -(Date.now() + Math.floor(Math.random() * 1000));
  const { error } = await supabase.from("agenda").insert({
    title,
    description,
    week,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    enabled: true,
    unitValue: null,
  });

  if (error) {
    throw new Error(`Error creating resource: ${error.message}`);
  }

  revalidateResourcePaths();
}

export async function updateResource(
  resourceId: number,
  title: string,
  description: string | null,
) {
  const supabase = await getAuthenticatedSupabase();

  const { error } = await supabase
    .from("agenda")
    .update({ title, description })
    .eq("id", resourceId);

  if (error) {
    throw new Error(`Error updating resource: ${error.message}`);
  }

  revalidateResourcePaths(resourceId);
}

export async function deleteResource(resourceId: number) {
  const supabase = await getAuthenticatedSupabase();

  const { error: sectionError } = await supabase
    .from("section")
    .delete()
    .eq("agenda_id", resourceId);

  if (sectionError) {
    throw new Error(`Error deleting resource sections: ${sectionError.message}`);
  }

  const { error } = await supabase.from("agenda").delete().eq("id", resourceId);

  if (error) {
    throw new Error(`Error deleting resource: ${error.message}`);
  }

  revalidateResourcePaths(resourceId);
}

export async function createSection(
  resourceId: number,
  title: string,
  description: string | null,
  order: number | null,
) {
  const supabase = await getAuthenticatedSupabase();

  // Resource sections reuse the agenda/section schema, but resource management does not
  // expose solo/group types to the editor. Preserve DB compatibility by using a default
  // production section type internally.
  const { error } = await supabase.from("section").insert({
    agenda_id: resourceId,
    title,
    description,
    type: "group",
    order,
  });

  if (error) {
    throw new Error(`Error creating section: ${error.message}`);
  }

  revalidateResourcePaths(resourceId);
}

export async function createTask(
  resourceId: number,
  sectionId: number,
  title: string,
  description: string | null,
  link: string | null,
  order: number | null,
) {
  const supabase = await getAuthenticatedSupabase();

  // Shared resource tasks reuse the standard task table. The resourceId is only used
  // for cache invalidation so affected admin/student resource pages refresh.
  const { error } = await supabase.from("task").insert({
    section_id: sectionId,
    title,
    description,
    link,
    order,
  });

  if (error) {
    throw new Error(`Error creating task: ${error.message}`);
  }

  revalidateResourcePaths(resourceId);
}

export async function createResourceAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) {
    throw new Error("Resource title is required.");
  }

  await createResource(title, description);
}
