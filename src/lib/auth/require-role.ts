import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireStaffRole(allowed: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/staff-login");
  const { data: profile } = await supabase.from("profiles").select("role,active,full_name").eq("id", user.id).single();
  if (!profile?.active) redirect("/staff-login?error=access");
  if (!allowed.includes(profile.role)) redirect("/admin?error=forbidden");
  return { user, profile };
}
