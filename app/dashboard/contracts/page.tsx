"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Loader2, FileText, Search, Send, Trash2 } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار الطلب", color: "bg-amber-100 text-amber-700" },
  requested: { label: "طلب تحويل", color: "bg-blue-100 text-blue-700" },
  processing: { label: "جارٍ التحويل", color: "bg-purple-100 text-purple-700" },
  paid: { label: "محوّل", color: "bg-green-100 text-green-700" },
};

export default function ContractsPage() {
  const supabase = createClient();
  const [contracts, setContracts] = useState<any[]>([]);
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ celebrity_id: "", campaign_id: "", amount: "", notes: "" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [{ data: con }, { data: cel }, { data: cam }] = await Promise.all([
      supabase.from("contracts").select("*, celebrity:celebrities(name, email), campaign:campaigns(name)").order("created_at", { ascending: false }),
      supabase.from("celebrities").select("id, name").order("name"),
      supabase.from("campaigns").select("id, name").eq("status", "active"),
    ]);
    setContracts(con || []);
    setCelebrities(cel || []);
    setCampaigns(cam || []);
    setLoading(false);
  }

  async function addContract(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("contracts").insert({
      celebrity_id: form.celebrity_id,
      campaign_id: form.campaign_id || null,
      amount: parseFloat(form.amount) || 0,
      notes: form.notes,
      status: "pending",
      added_by: user?.id,
    });
    setForm({ celebrity_id: "", campaign_id: "", amount: "", notes: "" });
    setShowForm(false);
    fetchData();
  }

  async function requestTransfer(id: string) {
    await supabase.from("contracts").update({ status: "requested" }).eq("id", id);
    fetchData();
  }

  async function deleteContract(id: string) {
    if (!confirm("هل تريد حذف هذا العقد؟")) return;
    await supabase.from("contracts").delete().eq("id", id);
    fetchData();
  }

  const filtered = contracts.filter(c =>
    c.celebrity?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.campaign?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">العقود والتحويلات</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contracts.length} عقد</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus className="w-4 h-4" /> عقد جديد
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إضافة عقد جديد</h2>
          <form onSubmit={addContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">المشهور *</label>
              <select value={form.celebrity_id} onChange={e => setForm({ ...form, celebrity_id: e.target.value })} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">اختر المشهور</option>
                {celebrities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الحملة</label>
              <select value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">بدون حملة</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">المبلغ (ر.س) *</label>
              <input type="number" placeholder="0" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
              <input type="text" placeholder="اختياري" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium">
                <Plus className="w-4 h-4" /> إضافة
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الحملة..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا توجد عقود</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">المشهور</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الحملة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
            </tr></thead>
            <tbody>
              {filtered.map(con => {
                const sc = statusConfig[con.status] || statusConfig.pending;
                return (
                  <tr key={con.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                          {con.celebrity?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{con.celebrity?.name}</p>
                          <p className="text-xs text-gray-400">{con.celebrity?.email || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{con.campaign?.name || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{con.amount?.toLocaleString("ar-SA")} ر.س</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {con.status === "pending" && (
                          <button onClick={() => requestTransfer(con.id)}
                            className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition">
                            <Send className="w-3 h-3" /> طلب تحويل
                          </button>
                        )}
                        <button onClick={() => deleteContract(con.id)} className="text-gray-300 hover:text-red-500 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
