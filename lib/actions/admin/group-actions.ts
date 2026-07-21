"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import {
  assignRoomsToGroups,
  DEFAULT_ROOM_GROUP_CAPACITY,
} from "@/lib/room-assignment";

import {
  type AssignStudentInput,
  type ManualGroupInput,
  validateManualGroupInput,
} from "@/lib/group-management";

import { requireAdmin } from "@/lib/actions/admin/auth";

import {
  loadExistingRoomUsage,
  loadRoomInventory,
} from "@/lib/actions/admin/room-helpers";

import {
  buildWarningsForStudents,
  getAlreadyGroupedStudents,
  getIndependentStudyStudents,
  getStudentsWithoutAgreement,
  loadStudentContexts,
} from "@/lib/actions/admin/student-helpers";

import type {
  GroupRow,
  ManualActionResult,
} from "@/lib/actions/admin/types";

function revalidateGroupPages() {
  revalidatePath("/admin/groups");
  revalidatePath("/student/group");
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    return {
      error: adminCheck.error ?? "Admin only",
    };
  }

  const { error: memberError } = await supabase
    .from("member_of")
    .delete()
    .eq("group_id", groupId);

  if (memberError) {
    console.error(
      "Error deleting group members:",
      memberError,
    );

    return {
      error: "Failed to delete group members",
    };
  }

  const { error: groupError } = await supabase
    .from("group")
    .delete()
    .eq("id", groupId);

  if (groupError) {
    console.error("Error deleting group:", groupError);

    return {
      error: "Failed to delete group",
    };
  }

  revalidateGroupPages();

  return {
    success: true,
  };
}

export async function createManualGroup(
  input: ManualGroupInput,
): Promise<ManualActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    return {
      error: adminCheck.error ?? "Admin only",
    };
  }

  const duplicateStudentIds = new Set<string>();
  const uniqueStudentIds = new Set<string>();

  for (const studentId of input.studentIds) {
    if (uniqueStudentIds.has(studentId)) {
      duplicateStudentIds.add(studentId);
    }

    uniqueStudentIds.add(studentId);
  }

  if (duplicateStudentIds.size > 0) {
    return {
      error: "Each student can only be selected once.",
    };
  }

  const validation = validateManualGroupInput(input);

  if (!validation.ok) {
    return {
      error: validation.error,
    };
  }

  const selectedStudentIds = [...uniqueStudentIds];

  const studentResult = await loadStudentContexts(
    supabase,
    selectedStudentIds,
  );

  if ("error" in studentResult) {
    return studentResult;
  }

  const students = studentResult.students;

  if (students.length !== selectedStudentIds.length) {
    return {
      error:
        "One or more selected students could not be found.",
    };
  }

  const alreadyGroupedStudents =
    getAlreadyGroupedStudents(students);

  if (alreadyGroupedStudents.length > 0) {
    return {
      error:
        alreadyGroupedStudents.length === 1
          ? `${
              alreadyGroupedStudents[0]?.full_name ??
              "A selected student"
            } is already assigned to a group. Refresh and try again.`
          : "One or more selected students are already assigned to a group. Refresh and try again.",
    };
  }

  const independentStudyStudents =
    getIndependentStudyStudents(students);

  if (independentStudyStudents.length > 0) {
    return {
      error:
        independentStudyStudents.length === 1
          ? `${
              independentStudyStudents[0]?.full_name ??
              "A selected student"
            } is in Independent Study and cannot be added to a group.`
          : "One or more selected students are in Independent Study and cannot be added to a group.",
    };
  }

  const studentsWithoutAgreement =
    getStudentsWithoutAgreement(students);

  if (studentsWithoutAgreement.length > 0) {
    return {
      error:
        studentsWithoutAgreement.length === 1
          ? `${
              studentsWithoutAgreement[0]?.full_name ??
              "A selected student"
            } has not accepted the Group Study Agreement and cannot be added to a group.`
          : "One or more selected students have not accepted the Group Study Agreement and cannot be added to a group.",
    };
  }

  const warnings = buildWarningsForStudents(
    students,
    validation.value,
  );

  if (
    warnings.length > 0 &&
    !input.overrideWarnings
  ) {
    return {
      requiresConfirmation: true,
      warnings,
    };
  }

  let manualRoomId: number | null = null;
  let manualRoomOverbooked = false;

  if (validation.value.preference === "in_person") {
    const roomInventoryResult =
      await loadRoomInventory(supabase);

    if ("error" in roomInventoryResult) {
      return roomInventoryResult;
    }

    const existingUsageResult =
      await loadExistingRoomUsage(supabase);

    if ("error" in existingUsageResult) {
      return existingUsageResult;
    }

    const assignmentPlan = assignRoomsToGroups(
      [
        {
          preference: "in_person",
          dayOfWeek: validation.value.dayOfWeek,
          meetStartTime:
            validation.value.meetStartTime,
        },
      ],
      roomInventoryResult.rooms,
      existingUsageResult.usage,
      false,
    );

    manualRoomId =
      assignmentPlan.assignments[0]?.roomId ??
      null;

    manualRoomOverbooked =
      assignmentPlan.assignments[0]?.overbooked ??
      false;
  }

  const { data: newGroup, error: groupError } =
    await supabase
      .from("group")
      .insert({
        group_name: validation.value.groupName,
        preference: validation.value.preference,
        day_of_week: validation.value.dayOfWeek,
        meet_start_time:
          validation.value.meetStartTime,
        meet_end_time:
          validation.value.meetEndTime,
        room_id: manualRoomId,
        room_overbooked: manualRoomOverbooked,
      })
      .select("id")
      .single();

  if (groupError || !newGroup) {
    console.error(
      "Error creating manual group:",
      groupError,
    );

    return {
      error: "Failed to create group",
    };
  }

  if (selectedStudentIds.length > 0) {
    const { error: memberError } = await supabase
      .from("member_of")
      .insert(
        selectedStudentIds.map((studentId) => ({
          group_id: newGroup.id,
          user_id: studentId,
        })),
      );

    if (memberError) {
      console.error(
        "Error assigning manual group members:",
        memberError,
      );

      await supabase
        .from("group")
        .delete()
        .eq("id", newGroup.id);

      return {
        error:
          "Failed to assign one or more students. The group was not created.",
      };
    }
  }

  revalidateGroupPages();

  return {
    success: true,
    warnings,
    assignedCount: selectedStudentIds.length,
    groupId: newGroup.id,
  };
}

export async function updateManualGroup(
  groupId: string,
  input: ManualGroupInput,
): Promise<ManualActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    return {
      error: adminCheck.error ?? "Admin only",
    };
  }

  const {
    data: existingGroup,
    error: groupError,
  } = await supabase
    .from("group")
    .select("id")
    .eq("id", groupId)
    .single();

  if (groupError || !existingGroup) {
    console.error(
      "Error loading group for update:",
      groupError,
    );

    return {
      error: "Group not found",
    };
  }

  const duplicateStudentIds = new Set<string>();
  const uniqueStudentIds = new Set<string>();

  for (const studentId of input.studentIds) {
    if (uniqueStudentIds.has(studentId)) {
      duplicateStudentIds.add(studentId);
    }

    uniqueStudentIds.add(studentId);
  }

  if (duplicateStudentIds.size > 0) {
    return {
      error: "Each student can only be selected once.",
    };
  }

  const validation = validateManualGroupInput(input);

  if (!validation.ok) {
    return {
      error: validation.error,
    };
  }

  const selectedStudentIds = [...uniqueStudentIds];

  const studentResult = await loadStudentContexts(
    supabase,
    selectedStudentIds,
  );

  if ("error" in studentResult) {
    return studentResult;
  }

  const students = studentResult.students;

  if (students.length !== selectedStudentIds.length) {
    return {
      error:
        "One or more selected students could not be found.",
    };
  }

  const alreadyGroupedStudents = students.filter(
    (student) =>
      (student.member_of?.length ?? 0) > 0 &&
      !student.member_of?.some(
        (membership) =>
          membership.group_id === groupId,
      ),
  );

  if (alreadyGroupedStudents.length > 0) {
    return {
      error:
        alreadyGroupedStudents.length === 1
          ? `${
              alreadyGroupedStudents[0]?.full_name ??
              "A selected student"
            } is already assigned to a different group. Refresh and try again.`
          : "One or more selected students are already assigned to a different group. Refresh and try again.",
    };
  }

  const independentStudyStudents =
    getIndependentStudyStudents(students);

  if (independentStudyStudents.length > 0) {
    return {
      error:
        independentStudyStudents.length === 1
          ? `${
              independentStudyStudents[0]?.full_name ??
              "A selected student"
            } is in Independent Study and cannot be added to a group.`
          : "One or more selected students are in Independent Study and cannot be added to a group.",
    };
  }

  const studentsWithoutAgreement =
    getStudentsWithoutAgreement(students);

  if (studentsWithoutAgreement.length > 0) {
    return {
      error:
        studentsWithoutAgreement.length === 1
          ? `${
              studentsWithoutAgreement[0]?.full_name ??
              "A selected student"
            } has not accepted the Group Study Agreement and cannot be added to a group.`
          : "One or more selected students have not accepted the Group Study Agreement and cannot be added to a group.",
    };
  }

  const warnings = buildWarningsForStudents(
    students,
    validation.value,
  );

  if (
    warnings.length > 0 &&
    !input.overrideWarnings
  ) {
    return {
      requiresConfirmation: true,
      warnings,
    };
  }

  let manualRoomId: number | null = null;
  let manualRoomOverbooked = false;

  if (validation.value.preference === "in_person") {
    const roomInventoryResult =
      await loadRoomInventory(supabase);

    if ("error" in roomInventoryResult) {
      return roomInventoryResult;
    }

    const existingUsageResult =
      await loadExistingRoomUsage(
        supabase,
        groupId,
      );

    if ("error" in existingUsageResult) {
      return existingUsageResult;
    }

    if (input.roomId != null) {
      const targetRoom =
        roomInventoryResult.rooms.find(
          (room) => room.id === input.roomId,
        );

      if (!targetRoom) {
        return {
          error: "Selected room not found.",
        };
      }

      if (
        !targetRoom.availableDays.includes(
          validation.value.dayOfWeek,
        )
      ) {
        return {
          error:
            "Selected room is not available on the chosen day.",
        };
      }

      const conflictingGroups =
        existingUsageResult.usage.filter(
          (usage) =>
            usage.roomId === input.roomId &&
            usage.dayOfWeek ===
              validation.value.dayOfWeek &&
            usage.meetStartTime ===
              validation.value.meetStartTime,
        );

      manualRoomId = targetRoom.id;

      manualRoomOverbooked =
        conflictingGroups.length + 1 >
        (targetRoom.groupCapacity ??
          DEFAULT_ROOM_GROUP_CAPACITY);
    } else {
      const assignmentPlan = assignRoomsToGroups(
        [
          {
            preference: "in_person",
            dayOfWeek:
              validation.value.dayOfWeek,
            meetStartTime:
              validation.value.meetStartTime,
          },
        ],
        roomInventoryResult.rooms,
        existingUsageResult.usage,
        false,
      );

      manualRoomId =
        assignmentPlan.assignments[0]?.roomId ??
        null;

      manualRoomOverbooked =
        assignmentPlan.assignments[0]
          ?.overbooked ?? false;
    }
  }

  const {
    data: currentMembers,
    error: currentMemberError,
  } = await supabase
    .from("member_of")
    .select("user_id")
    .eq("group_id", groupId);

  if (currentMemberError) {
    console.error(
      "Error loading current group members:",
      currentMemberError,
    );

    return {
      error: "Failed to update group members.",
    };
  }

  const currentMemberIds = (
    (currentMembers ?? []) as {
      user_id: string;
    }[]
  ).map((member) => member.user_id);

  const currentMemberSet = new Set(
    currentMemberIds,
  );

  const newMemberSet = new Set(
    selectedStudentIds,
  );

  const memberIdsToRemove =
    currentMemberIds.filter(
      (id) => !newMemberSet.has(id),
    );

  const memberIdsToAdd =
    selectedStudentIds.filter(
      (id) => !currentMemberSet.has(id),
    );

  const { error: updateError } = await supabase
    .from("group")
    .update({
      group_name: validation.value.groupName,
      preference: validation.value.preference,
      day_of_week: validation.value.dayOfWeek,
      meet_start_time:
        validation.value.meetStartTime,
      meet_end_time:
        validation.value.meetEndTime,
      room_id:
        validation.value.preference === "in_person"
          ? manualRoomId
          : null,
      room_overbooked:
        validation.value.preference === "in_person"
          ? manualRoomOverbooked
          : false,
    })
    .eq("id", groupId);

  if (updateError) {
    console.error(
      "Error updating group:",
      updateError,
    );

    return {
      error: "Failed to update group",
    };
  }

  if (memberIdsToRemove.length > 0) {
    const { error: removeError } =
      await supabase
        .from("member_of")
        .delete()
        .eq("group_id", groupId)
        .in("user_id", memberIdsToRemove);

    if (removeError) {
      console.error(
        "Error removing old group members:",
        removeError,
      );

      return {
        error: "Failed to update group members",
      };
    }
  }

  if (memberIdsToAdd.length > 0) {
    const { error: addError } = await supabase
      .from("member_of")
      .insert(
        memberIdsToAdd.map((studentId) => ({
          group_id: groupId,
          user_id: studentId,
        })),
      );

    if (addError) {
      console.error(
        "Error adding new group members:",
        addError,
      );

      return {
        error: "Failed to update group members",
      };
    }
  }

  revalidateGroupPages();

  return {
    success: true,
    warnings,
    assignedCount: memberIdsToAdd.length,
    groupId,
  };
}

export async function assignStudentToGroup(
  input: AssignStudentInput,
): Promise<ManualActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    return {
      error: adminCheck.error ?? "Admin only",
    };
  }

  const { data: group, error: groupError } =
    await supabase
      .from("group")
      .select(
        "id, preference, day_of_week, meet_start_time, meet_end_time",
      )
      .eq("id", input.groupId)
      .single<GroupRow>();

  if (groupError || !group) {
    console.error(
      "Error loading group for manual assignment:",
      groupError,
    );

    return {
      error: "Group not found",
    };
  }

  const validation = validateManualGroupInput({
    dayOfWeek: group.day_of_week ?? -1,
    meetStartTime:
      group.meet_start_time ?? "",
    meetEndTime: group.meet_end_time ?? "",
    preference:
      group.preference ?? "online",
  });

  if (!validation.ok) {
    return {
      error:
        "This group has invalid scheduling data and cannot accept manual assignments.",
    };
  }

  const studentResult = await loadStudentContexts(
    supabase,
    [input.userId],
  );

  if ("error" in studentResult) {
    return studentResult;
  }

  const student = studentResult.students[0];

  if (!student) {
    return {
      error: "Student not found",
    };
  }

  if ((student.member_of?.length ?? 0) > 0) {
    return {
      error: `${
        student.full_name ?? "This student"
      } is already assigned to a group. Refresh and try again.`,
    };
  }

  if (student.study_mode === "independent") {
    return {
      error: `${
        student.full_name ?? "This student"
      } is in Independent Study and cannot be assigned to a group.`,
    };
  }

  if (
    student.group_study_agreement_accepted !==
    true
  ) {
    return {
      error: `${
        student.full_name ?? "This student"
      } has not accepted the Group Study Agreement and cannot be assigned to a group.`,
    };
  }

  const warnings = buildWarningsForStudents(
    [student],
    validation.value,
  );

  if (
    warnings.length > 0 &&
    !input.overrideWarnings
  ) {
    return {
      requiresConfirmation: true,
      warnings,
    };
  }

  const { error: memberError } = await supabase
    .from("member_of")
    .insert({
      group_id: input.groupId,
      user_id: input.userId,
    });

  if (memberError) {
    console.error(
      "Error manually assigning student to group:",
      memberError,
    );

    return {
      error:
        "Failed to assign student. They may already be grouped.",
    };
  }

  revalidateGroupPages();

  return {
    success: true,
    warnings,
    assignedCount: 1,
  };
}

export async function removeStudentFromGroup({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);

  if ("error" in adminCheck) {
    return {
      error: adminCheck.error,
    };
  }

  const { error } = await supabase
    .from("member_of")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    console.error(
      "Error removing student from group:",
      error,
    );

    return {
      error: "Failed to remove student from group",
    };
  }

  revalidateGroupPages();

  return {
    success: true,
  };
}