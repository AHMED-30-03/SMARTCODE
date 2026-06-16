import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, company:companies(*)")
    .eq("id", user.id)
    .single();

  // Get all companies for super_admin
  let companies = null;
  if (profile?.role === "super_admin") {
    const { data } = await supabase.from("companies").select("*").order("name");
    companies = data;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar profile={profile} companies={companies} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
