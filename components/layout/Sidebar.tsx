"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, FileText, Settings, LogOut, TrendingUp, Receipt, Megaphone, Star } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { UserProfile, UserRole } from "@/types";
import clsx from "clsx";

const roleLabels: Record<UserRole, string> = {
  admin: "مدير النظام",
  campaign_manager: "مدير حملات",
  accountant: "محاسب",
};

const roleBadgeColors: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  campaign_manager: "bg-blue-100 text-blue-700",
  accountant: "bg-green-100 text-green-700",
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
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">لوحة المؤثرين</p>
            <p className="text-xs text-gray-400 truncate">إدارة الحملات</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}>
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
