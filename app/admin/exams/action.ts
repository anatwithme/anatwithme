"use server";

import { createClient } from "@/lib/supabase/server";

export async function createExam(title: string, examDate: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("exam").insert({
    title,
    exam_date: examDate,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteExam(examId: number) {
  const supabase = await createClient();

  const { error } = await supabase.from("exam").delete().eq("id", examId);

  if (error) {
    throw new Error(error.message);
  }
}
export async function updateExam(id: number, title: string, examDate: string) {
    const supabase = await createClient();
  
    const { error } = await supabase
      .from("exam")
      .update({ title, exam_date: examDate })
      .eq("id", id);
  
    if (error) {
      throw new Error(error.message);
    }
  }