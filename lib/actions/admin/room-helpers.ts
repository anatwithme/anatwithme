import {
  type ExistingRoomUsage,
  type RoomAssignmentCandidate,
  type RoomInventory,
  DEFAULT_ROOM_GROUP_CAPACITY,
} from "@/lib/room-assignment";

import type { SupabaseClient } from "@/lib/actions/admin/auth";

import type {
  ExistingScheduledGroupRow,
  RoomDayRow,
  RoomRow,
} from "@/lib/actions/admin/types";

export function slotIndexToTime(
  slotIndex: number,
  day: number,
) {
  const position = slotIndex - day * 16;
  const hourOfDay = 7 + position;

  return `${String(hourOfDay).padStart(
    2,
    "0",
  )}:00:00`;
}

function getRoomDays(roomDay: RoomDayRow) {
  if (!roomDay) {
    return [];
  }

  const entries = Array.isArray(roomDay)
    ? roomDay
    : [roomDay];

  return entries
    .map((entry) => entry.day)
    .filter(
      (day) =>
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 4,
    )
    .sort((left, right) => left - right);
}

export async function loadRoomInventory(
  supabase: SupabaseClient,
): Promise<
  { rooms: RoomInventory[] } | { error: string }
> {
  const { data: rooms, error } = await supabase
    .from("room")
    .select(
      "id, building, room_number, group_capacity, room_day(day)",
    );

  if (error) {
    console.error("Error fetching rooms:", error);

    return {
      error: "Failed to load room inventory",
    };
  }

  return {
    rooms: ((rooms ?? []) as RoomRow[]).map(
      (room) => ({
        id: room.id,
        building: room.building,
        roomNumber: room.room_number,
        groupCapacity:
          room.group_capacity ??
          DEFAULT_ROOM_GROUP_CAPACITY,
        availableDays: getRoomDays(room.room_day),
      }),
    ),
  };
}

export async function loadExistingRoomUsage(
  supabase: SupabaseClient,
  excludeGroupId?: string,
): Promise<
  { usage: ExistingRoomUsage[] } | { error: string }
> {
  const { data, error } = await supabase
    .from("group")
    .select(
      "id, room_id, day_of_week, meet_start_time",
    )
    .eq("preference", "in_person");

  if (error) {
    console.error(
      "Error fetching existing room usage:",
      error,
    );

    return {
      error: "Failed to load current room assignments",
    };
  }

  return {
    usage: (
      (data ?? []) as (
        ExistingScheduledGroupRow & {
          id: string;
        }
      )[]
    )
      .filter(
        (group) =>
          group.id !== excludeGroupId &&
          group.day_of_week !== null &&
          group.meet_start_time !== null &&
          group.day_of_week >= 0 &&
          group.day_of_week <= 4,
      )
      .map((group) => ({
        roomId: group.room_id,
        dayOfWeek: group.day_of_week ?? 0,
        meetStartTime:
          group.meet_start_time ?? "",
        groupCount: 1,
      })),
  };
}

export function buildRoomCandidates(
  groups: {
    preference: "in_person" | "online";
    window: {
      day: number;
      startIndex: number;
    };
  }[],
): RoomAssignmentCandidate[] {
  return groups.map((group) => ({
    preference: group.preference,
    dayOfWeek: group.window.day,
    meetStartTime: slotIndexToTime(
      group.window.startIndex,
      group.window.day,
    ),
  }));
}