import { AuthButton } from "@/components/auth/auth-button";
import { StudentNavbar } from "@/components/student/student-navbar";
import { AppBrand } from "@/components/layout/app-brand";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";

export default async function StudentLayout({
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
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "owner";

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full h-16 flex items-center">
        <AppBrand />
        <div className="ml-auto flex items-center gap-4">
          <StudentNavbar isAdmin={isAdmin} />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center">{children}</div>
    </main>
  );
}
