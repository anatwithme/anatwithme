import { createClient } from "@/lib/supabase/server";
import { StudentRosterTable } from "@/components/admin/student-roster-table";
import { AdminRosterTable } from "@/components/admin/admin-roster-table";
import { identity } from "lodash";

export default async function RosterPage() {
  const supabase = await createClient();

  const { data: isOwner } = await supabase.rpc("is_owner");

  const { data: students, error: studentProfilesError } = await supabase
    .from("profile")
    .select(
      `
      user_id,
      full_name,
      role,
      email,
      phone,
      preference,
      study_mode,
      profile_picture_url,
      member_of (
        group (
          id,
          preference,
          day_of_week,
          meet_start_time,
          meet_end_time
        )
      )
    `,
    )
    .eq("role", "student");

  if (studentProfilesError) {
    console.error("Failed to fetch student roster:", studentProfilesError.message);
  }

  const { data: admins, error: adminProfilesError } = await supabase
    .from("profile")
    .select(
      `
      user_id,
      full_name,
      role,
      email,
      phone,
      profile_picture_url
    `,
    )
    .in("role", ["admin", "owner"]);

  if (adminProfilesError) {
    console.error("Failed to fetch admin roster:", adminProfilesError.message);
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

  const studentRoster = (students ?? []).map((student) => ({
    ...student,
    savedSlotIds:
      availability
        ?.filter((row) => row.user_id === student.user_id)
        .map((row) => row.time_slot_id) ?? [],
  }));
  const adminRoster = admins ?? [];

  return (
    <div className="w-full max-w-7xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-muted-foreground text-sm">
            {studentRoster.length} {studentRoster.length === 1 ? "student" : "students"}{" "}
            registered
          </p>
        </div>
        <StudentRosterTable students={studentRoster} isOwner={!!isOwner} timeSlots={timeSlots ?? []}/>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">Administrators</h1>
          <p className="text-muted-foreground text-sm">
            {adminRoster.length} {adminRoster.length === 1 ? "admin" : "admins"}{" "}
            registered
          </p>
        </div>
        <AdminRosterTable admins={adminRoster} isOwner={!!isOwner} />
      </div>
    </div>
  );
}
