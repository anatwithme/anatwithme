/*
  app/admin/groups/page.tsx

  Server component. Handles auth, fetches groups, and passes everything
  down to AdminGroupsClient which handles the two views and button logic.
  Keeping this thin means the client component can call router.refresh()
  after generating groups and this page will re-run and pass fresh data.
*/

import AdminGroupsClient from "@/components/admin/admin-groups-client";
import { createClient } from "@/lib/supabase/server";

type UngroupedStudent = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  study_mode: "group" | "independent";
  group_study_agreement_accepted: boolean | null;
  profile_picture_url: string | null;
  member_of?: {
    group_id: string;
  }[] | null;
  savedSlotIds: number[];
};

export default async function AdminGroupsPage() {
  const supabase = await createClient();

  // fetch all groups with their members and member profiles
  const { data: groups } = await supabase
    .from("group")
    .select(
      `
      id,
      group_name,
      preference,
      day_of_week,
      meet_start_time,
      meet_end_time,
      room_id,
      room_overbooked,
      created_at,
      room (
        id,
        building,
        room_number
      ),
      member_of (
        user_id,
        profile (
          full_name,
          email
        )
      )
    `,
    )
    .order("created_at", { ascending: false });
  // fetch all rooms for the dropdown when creating/editing groups
  const { data: rooms, error: roomsError } = await supabase
    .from("room")
    .select("id, building, room_number")
    .order("building", { ascending: true })
    .order("room_number", { ascending: true });

  if (roomsError) {
    console.error("Failed to fetch rooms:", roomsError.message);
  }

  const { data: studentProfiles, error: studentProfilesError } = await supabase
    .from("profile")
    .select(
      `
      user_id,
      full_name,
      email,
      phone,
      preference,
      study_mode,
      group_study_agreement_accepted,
      profile_picture_url,
      member_of (
        group_id
      )
    `,
    )
    .eq("role", "student");

  if (studentProfilesError) {
    console.error(
      "Failed to fetch ungrouped students:",
      studentProfilesError.message,
    );
  }

  const { data: timeSlots, error: timeSlotsError } = await supabase
    .from("time_slot")
    .select("id, day, slot_index")
    .order("slot_index");

  if (timeSlotsError) {
    console.error("Failed to fetch time slots:", timeSlotsError.message);
  }

  const { data: availability, error: availabilityError } = await supabase
    .from("availability")
    .select("user_id, time_slot_id");

  if (availabilityError) {
    console.error("Failed to fetch availability:", availabilityError.message);
  }

  const allStudents: UngroupedStudent[] = (studentProfiles ?? []).map((student) => ({
    user_id: student.user_id,
    full_name: student.full_name,
    email: student.email,
    phone: student.phone,
    preference: student.preference,
    study_mode: student.study_mode,
    group_study_agreement_accepted: student.group_study_agreement_accepted,
    profile_picture_url: student.profile_picture_url,
    member_of: student.member_of,
    savedSlotIds:
      availability
        ?.filter((row) => row.user_id === student.user_id)
        .map((row) => row.time_slot_id) ?? [],
  }));

  const ungroupedStudents = allStudents
    .filter(
      (student) =>
        student.study_mode == "group" &&
        student.group_study_agreement_accepted &&
        (!student.member_of || student.member_of.length === 0),
    )
    .map(({ member_of: _memberOf, ...student }) => student);

  const independentStudents = allStudents
    .filter((student) => student.study_mode === "independent")
    .map(({ member_of: _memberOf, ...student }) => student);

  return (
    <div className="w-full max-w-7xl space-y-2">
      <AdminGroupsClient
        groups={groups ?? []}
        rooms={rooms ?? []}
        ungroupedStudents={ungroupedStudents}
        independentStudents={independentStudents}
        timeSlots={timeSlots ?? []}
      />
    </div>
  );
}
