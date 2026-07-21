import type {
  CompatibilityWarning,
  GroupPreference,
} from "@/lib/group-management";
import type { RoomOverflow } from "@/lib/room-assignment";

export type StudentProfileRow = {
  user_id: string;
  full_name: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  study_mode: "group" | "independent";
  group_study_agreement_accepted: boolean | null;
  member_of?: {
    group_id: string;
  }[] | null;
};

export type AvailabilityRow = {
  user_id: string;
  time_slot_id: number;
  time_slot:
    | {
        slot_index: number;
      }
    | {
        slot_index: number;
      }[]
    | null;
};

export type MatchingStudent = {
  user_id: string;
  full_name: string;
  preference: "in_person" | "online" | "no_preference";
  availability: {
    time_slot_id: number;
    slot_index: number;
  }[];
};

export type MatchingMode = "regroup_all" | "group_ungrouped";

export type GroupMembershipRow = {
  group_id: string;
};

export type GroupRow = {
  id: string;
  preference: GroupPreference | null;
  day_of_week: number | null;
  meet_start_time: string | null;
  meet_end_time: string | null;
  room_id?: number | null;
};

export type ManualStudentContext = {
  user_id: string;
  full_name: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  study_mode: "group" | "independent";
  group_study_agreement_accepted: boolean | null;
  member_of?: GroupMembershipRow[] | null;
  availabilitySlotIndexes: number[];
};

export type ManualActionResult =
  | { error: string }
  | {
      requiresConfirmation: true;
      warnings: CompatibilityWarning[];
    }
  | {
      success: true;
      warnings: CompatibilityWarning[];
      assignedCount?: number;
      groupId?: string;
    };

export type MatchingActionResult =
  | { error: string }
  | {
      requiresRoomConfirmation: true;
      groupsPreviewCount: number;
      flaggedCount: number;
      flagged: {
        user_id: string;
        full_name: string;
      }[];
      roomOverflow: RoomOverflow[];
    }
  | {
      groupsCreated: number;
      flaggedCount: number;
      flagged: {
        user_id: string;
        full_name: string;
      }[];
      roomOverflowCount: number;
      roomOverflow: RoomOverflow[];
      roomlessCount: number;
      overbookedCount: number;
    };

export type RoomDayRow =
  | {
      day: number;
    }
  | {
      day: number;
    }[]
  | null;

export type RoomRow = {
  id: number;
  building: string;
  room_number: string;
  group_capacity: number | null;
  room_day: RoomDayRow;
};

export type ExistingScheduledGroupRow = {
  room_id: number | null;
  day_of_week: number | null;
  meet_start_time: string | null;
};