import { createClient } from "@/lib/supabase/server";

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not logged in" } as const;
  }

  const { data: isAdmin, error: profileError } =
    await supabase.rpc("is_admin");

  if (profileError) {
    console.error("Error loading caller profile:", profileError);

    return {
      error: "Failed to verify admin access",
    } as const;
  }

  if (!isAdmin) {
    return { error: "Admin only" } as const;
  }

  return {
    userId: user.id,
  } as const;
}