"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAgenda(
  title: string,
  description: string | null,
  week: number,
  startDate: string,
  endDate: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  const { error: agendaError } = await supabase.from("agenda").insert({
    title,
    description,
    week,
    start_date: startDate,
    end_date: endDate,
    enabled: true,
  });

  if (agendaError) {
    throw new Error(`Error creating agenda: ${agendaError.message}`);
  }

  revalidatePath("/admin/agendas");
}

export async function updateAgenda(
  agendaId: number,
  title: string,
  description: string | null,
  week: number,
  startDate: string,
  endDate: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  const { error: agendaError } = await supabase
    .from("agenda")
    .update({
      title,
      description,
      week,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", agendaId);

  if (agendaError) {
    throw new Error(`Error updating agenda: ${agendaError.message}`);
  }

  revalidatePath("/admin/agendas");
}

export async function deleteAgenda(agendaId: number) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  const { error: sectionError } = await supabase
    .from("section")
    .delete()
    .eq("agenda_id", agendaId);

  if (sectionError) {
    throw new Error(`Error deleting agenda sections: ${sectionError.message}`);
  }

  const { error: agendaError } = await supabase
    .from("agenda")
    .delete()
    .eq("id", agendaId);

  if (agendaError) {
    throw new Error(`Error deleting agenda: ${agendaError.message}`);
  }

  revalidatePath("/admin/agendas");
}

export async function copyAgenda(agendaId: number) {
  const supabase = await createClient();

  const { data: originalAgenda, error: agendaFetchError } = await supabase
    .from("agenda")
    .select(
      `
      title, 
      description, 
      start_date, 
      end_date,
      sections:section(
        id,
        title,
        description,
        type,
        order,
        tasks:task(
          title,
          description,
          link,
          order
        )
      )
      `
    )
    .eq("id", agendaId)
    .single();

  if (agendaFetchError || !originalAgenda) {
    throw new Error(`Error fetching agenda to copy: ${agendaFetchError?.message}`);
  }

  const { data: copiedAgenda, error: insertAgendaError } = await supabase
    .from("agenda")
    .insert({
      title: `${originalAgenda.title} Copy`,
      description: originalAgenda.description,
      week: null,
      start_date: originalAgenda.start_date,
      end_date: originalAgenda.end_date,
      enabled: false,
    })
    .select("id")
    .single();

  if (insertAgendaError || !copiedAgenda) {
    throw new Error(`Error copying agenda: ${insertAgendaError.message}`);
  }

  const sections = originalAgenda.sections ?? [];

  for (const section of sections) {
    const { data: copiedSection, error: insertSectionError } = await supabase
      .from("section")
      .insert({
        agenda_id: copiedAgenda.id,
        title: section.title,
        description: section.description,
        type: section.type,
        order: section.order,
      })
      .select("id")
      .single()

    if (insertSectionError || !copiedSection) {
      throw new Error(`Error copying section: ${insertSectionError?.message}`);
    }

    const tasks = section.tasks ?? [];

    if (tasks.length > 0) {
      const copiedTasks = tasks.map((task) => ({
        section_id: copiedSection.id,
        title: task.title,
        description: task.description,
        link: task.link,
        order: task.order,
      }));

      const { error: insertTaskError } = await supabase
        .from("task")
        .insert(copiedTasks);

      if (insertTaskError) {
        throw new Error(`Error copying task: ${insertTaskError?.message}`);
      }
    }
  }

  revalidatePath("/admin/agendas");
}

export async function reorderAgendas(agendas: { id: number; week: number; enabled: boolean;}[]) {
  const supabase = await createClient();

  // Temporary negate week numbers to avoid conflicts
  for (let i = 0; i < agendas.length; i++) {
    const { error: agendaError } = await supabase
      .from("agenda")
      .update({ week: -(i + 1) })
      .eq("id", agendas[i].id);

    if (agendaError) {
      throw new Error(`Error saving reorder: ${agendaError.message}`);
    }
  }

  // Update to final week numbers
  for (let i = 0; i < agendas.length; i++) {
    const { error: agendaError } = await supabase
      .from("agenda")
      .update({ week: i + 1 })
      .eq("id", agendas[i].id);

    if (agendaError) {
      throw new Error(`Error saving reorder: ${agendaError.message}`);
    }
  }

  revalidatePath("/admin/agendas");
}

export async function toggleAgenda(agendaId: number, enabled: boolean) {
  const supabase = await createClient();

  const { error: agendaError } = await supabase
    .from("agenda")
    .update({ enabled })
    .eq("id", agendaId);

  if (agendaError) {
    throw new Error(`Error updating agenda status: ${agendaError.message}`);
  }

  revalidatePath("/admin/agendas");
}
