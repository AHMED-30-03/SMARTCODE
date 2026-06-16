import { createClient } from "./supabase";

export async function getUserCompany() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, company:companies(*)")
    .eq("id", user.id)
    .single();

  return profile;
}

export function isSuperAdmin(profile: any) {
  return profile?.role === "super_admin";
}
