"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Settings, LogOut, TrendingUp, Receipt, Megaphone, Star, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { UserProfile, UserRole } from "@/types";
import Image from "next/image";
import clsx from "clsx";

const roleLabels: Record<UserRole, string> = {
  admin: "مدير النظام",
  campaign_manager: "مدير حملات",
  accountant: "محاسب",
};

const roleBadgeColors: Record<UserRole, string> = {
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

export default function Sidebar({ profile }: { profile: UserProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="w-60 bg-white border-l border-gray-100 flex flex-col shadow-sm shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="Smart Code" width={40} height={40} className="rounded-lg object-contain" />
          <div className="min-w-0">
            <p className="font-bold text-[#3D3D3D] text-sm">Smart Code</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              style={active ? { backgroundColor: "#5BB8E8" } : {}}>
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2.5 mb-1">
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
