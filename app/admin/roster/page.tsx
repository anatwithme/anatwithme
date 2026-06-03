import { createClient } from "@/lib/supabase/server";
import { StudentRosterTable } from "@/components/admin/student-roster-table";
import { AdminRosterTable } from "@/components/admin/admin-roster-table";

export default async function RosterPage() {
  const supabase = await createClient();

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
    .in("role", ["admin", "owner"]);

  if (adminProfilesError) {
    console.error("Failed to fetch admin roster:", adminProfilesError.message);
  }

  const studentRoster = students ?? [];
  const adminRoster = admins ?? [];

  return (
    <div className="w-full max-w-7xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">Student Roster</h1>
          <p className="text-muted-foreground text-sm">
            {studentRoster.length} {studentRoster.length === 1 ? "student" : "students"}{" "}
            registered
          </p>
        </div>
        <StudentRosterTable students={studentRoster} />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">Administrators</h1>
          <p className="text-muted-foreground text-sm">
            {adminRoster.length} {adminRoster.length === 1 ? "admin" : "admins"}{" "}
            registered
          </p>
        </div>
        <AdminRosterTable admins={adminRoster} />
      </div>
    </div>
  );
}
