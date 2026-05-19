"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Loader2, Megaphone, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Campaign } from "@/types";

export default function CampaignsPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", budget: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("campaigns").insert({
      name: form.name,
      description: form.description,
      budget: parseFloat(form.budget) || 0,
      status: "active",
      created_by: user?.id,
    });
    setForm({ name: "", description: "", budget: "" });
    setShowForm(false);
    setSaving(false);
    fetchCampaigns();
  }

  const statusLabels: Record<string, string> = { active: "نشطة", completed: "مكتملة", paused: "متوقفة" };
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    paused: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الحملات التسويقية</h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaigns.length} حملة</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus className="w-4 h-4" /> حملة جديدة
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إنشاء حملة جديدة</h2>
          <form onSubmit={createCampaign} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم الحملة *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="مثال: حملة رمضان 2025" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الميزانية (ر.س)</label>
              <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الوصف</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="وصف مختصر" />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء الحملة
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد حملات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map(c => (
            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-blue-500" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[c.status]}`}>
                  {statusLabels[c.status]}
                </span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{c.name}</h3>
              {c.description && <p className="text-sm text-gray-500 mb-3 line-clamp-1">{c.description}</p>}
              {c.budget > 0 && (
                <p className="text-sm text-gray-600">الميزانية: <span className="font-semibold">{c.budget.toLocaleString("ar-SA")} ر.س</span></p>
              )}
              <div className="flex items-center text-blue-500 text-sm mt-3 opacity-0 group-hover:opacity-100 transition">
                عرض التفاصيل <ChevronLeft className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
