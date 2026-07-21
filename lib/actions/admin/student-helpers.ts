import {
  buildCompatibilityWarnings,
  type CompatibilityWarning,
  type GroupPreference,
} from "@/lib/group-management";
import type { SupabaseClient } from "@/lib/actions/admin/auth";

import type {
  ManualStudentContext,
  StudentProfileRow,
} from "@/lib/actions/admin/types";

export async function loadStudentContexts(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<
  { students: ManualStudentContext[] } | { error: string }
> {
  if (userIds.length === 0) {
    return { students: [] };
  }

  const uniqueIds = [...new Set(userIds)];

  const { data: studentProfiles, error: profileError } =
    await supabase
      .from("profile")
      .select(
        "user_id, full_name, preference, study_mode, group_study_agreement_accepted, member_of(group_id)",
      )
      .in("user_id", uniqueIds)
      .eq("role", "student");

  if (profileError) {
    console.error(
      "Error fetching student profiles:",
      profileError,
    );

    return {
      error: "Failed to load selected students",
    };
  }

  const { data: availabilityRows, error: availabilityError } =
    await supabase
      .from("availability")
      .select("user_id, time_slot(slot_index)")
      .in("user_id", uniqueIds);

  if (availabilityError) {
    console.error(
      "Error fetching student availability:",
      availabilityError,
    );

    return {
      error: "Failed to load student availability",
    };
  }

  const slotIndexesByUser = new Map<string, number[]>();

  for (const row of (availabilityRows ?? []) as {
    user_id: string;
    time_slot:
      | {
          slot_index: number;
        }
      | {
          slot_index: number;
        }[]
      | null;
  }[]) {
    const timeSlot = Array.isArray(row.time_slot)
      ? row.time_slot[0]
      : row.time_slot;

    if (!timeSlot) {
      continue;
    }

    const existing =
      slotIndexesByUser.get(row.user_id) ?? [];

    existing.push(timeSlot.slot_index);

    slotIndexesByUser.set(row.user_id, existing);
  }

  const students = (
    (studentProfiles ?? []) as StudentProfileRow[]
  ).map((student) => ({
    ...student,
    availabilitySlotIndexes:
      slotIndexesByUser.get(student.user_id) ?? [],
  }));

  return { students };
}

export function buildWarningsForStudents(
  students: ManualStudentContext[],
  group: {
    dayOfWeek: number;
    meetStartTime: string;
    meetEndTime: string;
    preference: GroupPreference;
  },
) {
  return students
    .map((student) =>
      buildCompatibilityWarnings({
        group,
        userId: student.user_id,
        studentName: student.full_name ?? "Unknown",
        studentPreference:
          student.preference ?? "no_preference",
        availabilitySlotIndexes:
          student.availabilitySlotIndexes,
      }),
    )
    .filter(
      (
        warning,
      ): warning is CompatibilityWarning =>
        warning !== null,
    );
}

export function getAlreadyGroupedStudents(
  students: ManualStudentContext[],
) {
  return students.filter(
    (student) =>
      (student.member_of?.length ?? 0) > 0,
  );
}

export function getIndependentStudyStudents(
  students: ManualStudentContext[],
) {
  return students.filter(
    (student) =>
      student.study_mode === "independent",
  );
}

export function getStudentsWithoutAgreement(
  students: ManualStudentContext[],
) {
  return students.filter(
    (student) =>
      student.group_study_agreement_accepted !== true,
  );
}