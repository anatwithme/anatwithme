import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/student-profile";

export default async function ProtectedStudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user?.id) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profile")
    .select("role, consent_status, full_name, preference")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "owner";
  const isStudent = !isAdmin;

  if (isAdmin) {
    return <>{children}</>;
  }

  if (!isProfileComplete(profile)) {
    redirect("/student/profile?incomplete=1");
  }

  if (isStudent && profile?.consent_status === "pending") {
    redirect("/consent");
  }

  return <>{children}</>;
}
