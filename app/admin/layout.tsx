import { AuthButton } from "@/components/auth/auth-button";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AppBrand } from "@/components/layout/app-brand";
import { Suspense } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full h-16 flex items-center">
        <AppBrand />
        <div className="ml-auto flex items-center gap-4">
          <AdminNavbar />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </header>

      <main className="flex-1 flex justify-center py-6">{children}</main>
    </div>
  );
}
