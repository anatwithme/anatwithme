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

  const { error: copyAgendaError } = await supabase.rpc("copy_agenda", {
    source_agenda_id: agendaId,
  });

  if (copyAgendaError) {
    throw new Error(`Error copying agenda: ${copyAgendaError?.message}`);
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
