import { createServerSupabase } from "@/lib/supabase-server";
import { TrendingUp, Users, FileCheck, Clock, DollarSign } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();

  const [
    { count: totalInfluencers },
    { count: pendingCount },
    { count: paidCount },
    { count: receiptCount },
    { data: campaigns },
    { data: recentTransfers },
  ] = await Promise.all([
    supabase.from("influencers").select("*", { count: "exact", head: true }),
    supabase.from("influencers").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("influencers").select("*", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("receipts").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("id, name, status").limit(5),
    supabase.from("receipts").select("*, influencer:influencers(name, amount)").order("created_at", { ascending: false }).limit(5),
  ]);

  const { data: paidData } = await supabase.from("influencers").select("amount").eq("status", "paid");
  const totalPaid = paidData?.reduce((s, i) => s + (i.amount || 0), 0) || 0;

  const stats = [
    { label: "إجمالي المؤثرين", value: totalInfluencers || 0, icon: Users, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
    { label: "المبلغ المحول", value: `${totalPaid.toLocaleString("ar-SA")} ر.س`, icon: DollarSign, color: "bg-green-50 text-green-600", border: "border-green-100" },
    { label: "بانتظار التحويل", value: pendingCount || 0, icon: Clock, color: "bg-amber-50 text-amber-600", border: "border-amber-100" },
    { label: "الإيصالات المولدة", value: receiptCount || 0, icon: FileCheck, color: "bg-purple-50 text-purple-600", border: "border-purple-100" },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm mt-0.5">نظرة عامة على جميع الحملات والتحويلات</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`bg-white rounded-2xl p-5 border ${stat.border} shadow-sm`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> آخر التحويلات
          </h2>
          {recentTransfers?.length ? (
            <div className="space-y-3">
              {recentTransfers.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.influencer?.name || "—"}</p>
                    <p className="text-xs text-gray-400">{r.receipt_number}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {(r.amount || 0).toLocaleString("ar-SA")} ر.س
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد تحويلات بعد</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">الحملات النشطة</h2>
          {campaigns?.length ? (
            <div className="space-y-2">
              {campaigns.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    c.status === "active" ? "bg-green-100 text-green-700" :
                    c.status === "completed" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"
                  }`}>
                    {c.status === "active" ? "نشطة" : c.status === "completed" ? "مكتملة" : "متوقفة"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد حملات بعد</p>
          )}
        </div>
      </div>
    </div>
  );
}
