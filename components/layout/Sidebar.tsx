"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Settings, LogOut, TrendingUp, Receipt, Megaphone, Star, Building2, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { UserProfile, UserRole } from "@/types";
import Image from "next/image";
import clsx from "clsx";
import { useState } from "react";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "مدير النظام",
  campaign_manager: "مدير حملات",
  accountant: "محاسب",
};

const roleBadgeColors: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  campaign_manager: "bg-sky-100 text-sky-700",
  accountant: "bg-gray-100 text-gray-700",
};

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "الحملات", icon: Megaphone },
  { href: "/dashboard/invoices", label: "الفواتير", icon: FileText },
  { href: "/dashboard/celebrities", label: "المشاهير", icon: Star },
  { href: "/dashboard/contracts", label: "العقود", icon: FileText },
  { href: "/dashboard/transfers", label: "التحويلات", icon: TrendingUp },
  { href: "/dashboard/receipts", label: "الإيصالات", icon: Receipt },
  { href: "/dashboard/users", label: "المستخدمون", icon: Settings },
];

export default function Sidebar({ profile, companies }: { profile: any; companies?: any[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showCompanies, setShowCompanies] = useState(false);
  const isSuperAdmin = profile?.role === "super_admin";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  async function switchCompany(companyId: string) {
    await supabase.from("profiles").update({ company_id: companyId }).eq("id", profile.id);
    setShowCompanies(false);
    router.refresh();
  }

  return (
    <aside className="w-60 bg-white border-l border-gray-100 flex flex-col shadow-sm shrink-0">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="Smart Code" width={36} height={36} className="rounded-lg object-contain shrink-0" />
          <p className="font-bold text-[#3D3D3D] text-sm truncate">Smart Code</p>
        </div>

        {/* Company selector */}
        {profile?.company && (
          <div className="mt-3 relative">
            <button onClick={() => isSuperAdmin && setShowCompanies(!showCompanies)}
              className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition",
                isSuperAdmin ? "hover:bg-gray-50 cursor-pointer" : "cursor-default",
                "bg-gray-50 border border-gray-100"
              )}>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-700 truncate">{profile.company.name}</span>
              </div>
              {isSuperAdmin && <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            </button>

            {showCompanies && isSuperAdmin && companies && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                {companies.map(c => (
                  <button key={c.id} onClick={() => switchCompany(c.id)}
                    className={clsx("w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 transition",
                      profile.company.id === c.id ? "text-blue-600 font-medium bg-blue-50" : "text-gray-700"
                    )}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active ? "text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              style={active ? { backgroundColor: "#5BB8E8" } : {}}>
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="font-medium text-gray-800 text-sm truncate">{profile?.full_name || "مستخدم"}</p>
          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", roleBadgeColors[profile?.role || "accountant"])}>
            {roleLabels[profile?.role || "accountant"]}
          </span>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition">
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
