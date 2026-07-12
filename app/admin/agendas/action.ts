"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAgenda(
  title: string,
  description: string | null,
  week: number,
  startDate: string,
  endDate: string,
  unitValue: number | null,
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
    unitValue,
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
  unitValue: number | null,
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
      unitValue,
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

export async function applyDatesToActiveAgendas( 
  semesterStartDate: string, 
  semesterEndDate: string, 
) {
  const supabase = await createClient();

  const semesterStart = new Date(`${semesterStartDate}T00:00:00`);
  const semesterEnd = new Date(`${semesterEndDate}T00:00:00`);

  if (Number.isNaN(semesterStart.getTime()) || Number.isNaN(semesterEnd.getTime())) {
    throw new Error("Invalid semester dates.");
  }

  if (semesterEnd < semesterStart) {
    throw new Error("Semester end date must be after semester start date.");
  }

  const { data: agendas, error} = await supabase
    .from("agenda")
    .select("id")
    .eq("enabled", true)
    .gt("week", 0)
    .order("week", { ascending: true });

  if (error) {
    throw new Error(`Failed to load active agendas: ${error?.message}`);
  }

  const updates = agendas.map((agenda, index) => {
    const start = new Date(`${semesterStartDate}T00:00:00`);
    start.setDate(start.getDate() + index * 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    if (end > semesterEnd) {
      throw new Error(`The number of active agendas surpasses the number of weeks in the date range you have provided.`)
    }

    return {
      id: agenda.id,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    };
  });

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("agenda")
      .update({
        start_date: update.start_date,
        end_date: update.end_date,
      })
      .eq("id", update.id);

    if (updateError) {
      throw new Error(`Failed to update agenda dates: ${updateError?.message}`);
    }
  }

  revalidatePath("/admin/agendas");
}
