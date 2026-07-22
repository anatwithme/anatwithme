"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { requireAdmin } from "@/lib/actions/admin/auth";


export async function removeStudent(
  studentId: string,
) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    throw new Error(adminCheck.error);
  }

  const { data: targetProfile, error: targetProfileError } =
    await supabase
      .from("profile")
      .select("role")
      .eq("user_id", studentId);

  if (targetProfileError) {
    console.error(
      "Failed to load student profile:",
      targetProfileError.message,
    );

    throw new Error(targetProfileError.message);
  }

  const studentProfile = targetProfile?.[0];

  if (!studentProfile) {
    throw new Error("Student profile not found.");
  }

  if (studentProfile.role !== "student") {
    throw new Error(
      "Only student accounts can be deleted.",
    );
  }

  const { error } = await (
    await adminClient
  ).auth.admin.deleteUser(studentId);

  if (error) {
    console.error(
      "Failed to remove student:",
      error.message,
    );

    throw new Error(error.message);
  }

  revalidatePath("/admin/roster");
}

export async function promoteStudent(
  studentId: string,
) {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    throw new Error(adminCheck.error);
  }

  const { error: callError } = await supabase.rpc(
    "set_user_role",
    {
      target_user: studentId,
      new_role: "admin",
    },
  );

  if (callError) {
    throw new Error(
      `ERROR: Promoting student resulted in the following error - ${
        callError.message ?? "Unknown Error"
      }`,
    );
  }

  revalidatePath("/admin/roster");
}

export async function removeAdmin(adminId: string) {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    throw new Error(adminCheck.error);
  }

  const { error: callError } = await supabase.rpc(
    "set_user_role",
    {
      target_user: adminId,
      new_role: "student",
    },
  );

  if (callError) {
    throw new Error(
      `ERROR: Removing administrator resulted in the following error - ${
        callError.message ?? "Unknown Error"
      }`,
    );
  }

  revalidatePath("/admin/roster");
}