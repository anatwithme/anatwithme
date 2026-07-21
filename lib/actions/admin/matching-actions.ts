"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { runMatchingAlgorithm } from "@/lib/matching";

import {
  assignRoomsToGroups,
} from "@/lib/room-assignment";

import { requireAdmin } from "@/lib/actions/admin/auth";

import {
  buildRoomCandidates,
  loadExistingRoomUsage,
  loadRoomInventory,
  slotIndexToTime,
} from "@/lib/actions/admin/room-helpers";

import type {
  AvailabilityRow,
  MatchingActionResult,
  MatchingMode,
  MatchingStudent,
  StudentProfileRow,
} from "@/lib/actions/admin/types";

function formatFlaggedStudents(
  students: MatchingStudent[],
) {
  return students.map((student) => ({
    user_id: student.user_id,
    full_name: student.full_name,
  }));
}

export async function runMatchingAction(
  mode: MatchingMode = "group_ungrouped",
  options?: {
    overrideRoomCapacity?: boolean;
  },
): Promise<MatchingActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    return {
      error: adminCheck.error ?? "Admin only",
    };
  }

  const {
    data: studentProfiles,
    error: profileError,
  } = await supabase
    .from("profile")
    .select(
      "user_id, full_name, preference, study_mode, group_study_agreement_accepted, member_of(group_id)",
    )
    .eq("role", "student");

  if (profileError) {
    console.error(
      "Error fetching profiles:",
      profileError,
    );

    return {
      error: "Failed to fetch students",
    };
  }

  const {
    data: availabilityRows,
    error: availabilityError,
  } = await supabase
    .from("availability")
    .select(
      "user_id, time_slot_id, time_slot(slot_index)",
    );

  if (availabilityError) {
    console.error(
      "Error fetching availability:",
      availabilityError,
    );

    return {
      error: "Failed to fetch availability",
    };
  }

  const availabilityByUser: Record<
    string,
    {
      time_slot_id: number;
      slot_index: number;
    }[]
  > = {};

  for (const row of (
    availabilityRows ?? []
  ) as AvailabilityRow[]) {
    const slot = Array.isArray(row.time_slot)
      ? row.time_slot[0]
      : row.time_slot;

    if (!slot) {
      continue;
    }

    if (!availabilityByUser[row.user_id]) {
      availabilityByUser[row.user_id] = [];
    }

    availabilityByUser[row.user_id].push({
      time_slot_id: row.time_slot_id,
      slot_index: slot.slot_index,
    });
  }

  const students: MatchingStudent[] = (
    (studentProfiles ?? []) as StudentProfileRow[]
  )
    .filter(
      (profile) =>
        profile.study_mode !== "independent" &&
        profile.group_study_agreement_accepted ===
          true &&
        (mode === "regroup_all"
          ? true
          : !profile.member_of ||
            profile.member_of.length === 0),
    )
    .map((profile) => ({
      user_id: profile.user_id,
      full_name:
        profile.full_name ?? "Unknown",
      preference:
        profile.preference ?? "no_preference",
      availability:
        availabilityByUser[profile.user_id] ?? [],
    }));

  const { groups, flagged } =
    runMatchingAlgorithm(students);

  const flaggedStudents =
    formatFlaggedStudents(flagged);

  const roomInventoryResult =
    await loadRoomInventory(supabase);

  if ("error" in roomInventoryResult) {
    return roomInventoryResult;
  }

  const existingUsageResult =
    mode === "group_ungrouped"
      ? await loadExistingRoomUsage(supabase)
      : { usage: [] };

  if ("error" in existingUsageResult) {
    return existingUsageResult;
  }

  const roomAssignmentPlan =
    assignRoomsToGroups(
      buildRoomCandidates(groups),
      roomInventoryResult.rooms,
      existingUsageResult.usage,
      options?.overrideRoomCapacity ?? false,
    );

  if (
    roomAssignmentPlan.overflow.length > 0 &&
    !(options?.overrideRoomCapacity ?? false)
  ) {
    return {
      requiresRoomConfirmation: true,
      groupsPreviewCount: groups.length,
      flaggedCount: flaggedStudents.length,
      flagged: flaggedStudents,
      roomOverflow:
        roomAssignmentPlan.overflow,
    };
  }

  if (mode === "regroup_all") {
    const { error: memberDeleteError } =
      await supabase
        .from("member_of")
        .delete()
        .not("group_id", "is", null);

    if (memberDeleteError) {
      console.error(
        "Error clearing group memberships:",
        memberDeleteError,
      );

      return {
        error:
          "Failed to clear existing group memberships",
      };
    }

    const { error: groupDeleteError } =
      await supabase
        .from("group")
        .delete()
        .not("id", "is", null);

    if (groupDeleteError) {
      console.error(
        "Error clearing existing groups:",
        groupDeleteError,
      );

      return {
        error: "Failed to clear existing groups",
      };
    }
  }

  let groupsCreated = 0;
  let roomlessCount = 0;
  let overbookedCount = 0;

  for (const [index, group] of groups.entries()) {
    const startTime = slotIndexToTime(
      group.window.startIndex,
      group.window.day,
    );

    const endTime = slotIndexToTime(
      group.window.startIndex + 1,
      group.window.day,
    );

    const roomAssignment =
      roomAssignmentPlan.assignments[index] ?? {
        roomId: null,
        overbooked: false,
      };

    const { data: newGroup, error: groupError } =
      await supabase
        .from("group")
        .insert({
          preference: group.preference,
          day_of_week: group.window.day,
          meet_start_time: startTime,
          meet_end_time: endTime,
          room_id: roomAssignment.roomId,
          room_overbooked:
            roomAssignment.overbooked,
        })
        .select("id")
        .single();

    if (groupError) {
      console.error(
        "Error inserting group:",
        groupError,
      );

      continue;
    }

    const memberRows = group.members.map(
      (member) => ({
        group_id: newGroup.id,
        user_id: member.user_id,
      }),
    );

    const { error: memberError } =
      await supabase
        .from("member_of")
        .insert(memberRows);

    if (memberError) {
      console.error(
        "Error inserting members for group",
        newGroup.id,
        memberError,
      );
    }

    if (
      group.preference === "in_person" &&
      roomAssignment.roomId === null
    ) {
      roomlessCount++;
    }

    if (roomAssignment.overbooked) {
      overbookedCount++;
    }

    groupsCreated++;
  }

  revalidatePath("/admin/groups");
  revalidatePath("/student/group");

  return {
    groupsCreated,
    flaggedCount: flaggedStudents.length,
    flagged: flaggedStudents,
    roomOverflowCount:
      roomAssignmentPlan.overflow.length,
    roomOverflow:
      roomAssignmentPlan.overflow,
    roomlessCount,
    overbookedCount,
  };
}