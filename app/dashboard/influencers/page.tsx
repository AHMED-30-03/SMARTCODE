"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Loader2, Users, Search, Send, Pencil, X, Check, Trash2 } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار الطلب", color: "bg-amber-100 text-amber-700" },
  requested: { label: "طلب تحويل", color: "bg-blue-100 text-blue-700" },
  processing: { label: "جارٍ التحويل", color: "bg-purple-100 text-purple-700" },
  paid: { label: "محوّل", color: "bg-green-100 text-green-700" },
};

export default function InfluencersPage() {
  const supabase = createClient();
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [manualForm, setManualForm] = useState({
    name: "", amount: "", iban: "", bank_name: "", campaign_id: "", email: "", whatsapp: ""
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [{ data: inf }, { data: camp }] = await Promise.all([
      supabase.from("influencers").select("*, campaign:campaigns(name)").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("id, name").eq("status", "active"),
    ]);
    setInfluencers(inf || []);
    setCampaigns(camp || []);
    setLoading(false);
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("influencers").insert({
      name: manualForm.name,
      amount: parseFloat(manualForm.amount) || 0,
      iban: manualForm.iban,
      bank_name: manualForm.bank_name,
      campaign_id: manualForm.campaign_id || null,
      email: manualForm.email,
      whatsapp: manualForm.whatsapp,
      status: "pending",
      added_by: user?.id,
    });
    setManualForm({ name: "", amount: "", iban: "", bank_name: "", campaign_id: "", email: "", whatsapp: "" });
    setShowManual(false);
    fetchData();
  }

  async function requestTransfer(id: string) {
    await supabase.from("influencers").update({ status: "requested" }).eq("id", id);
    fetchData();
  }

  function startEdit(inf: any) {
    setEditingId(inf.id);
    setEditForm({
      name: inf.name || "",
      amount: inf.amount || 0,
      iban: inf.iban || "",
      bank_name: inf.bank_name || "",
      email: inf.email || "",
      whatsapp: inf.whatsapp || "",
    });
  }

  async function saveEdit(id: string) {
    await supabase.from("influencers").update({
      name: editForm.name,
      amount: parseFloat(editForm.amount) || 0,
      iban: editForm.iban,
      bank_name: editForm.bank_name,
      email: editForm.email,
      whatsapp: editForm.whatsapp,
    }).eq("id", id);
    setEditingId(null);
    fetchData();
  }

  async function deleteInfluencer(id: string) {
    if (!confirm("هل تريد حذف هذا المشهور؟")) return;
    await supabase.from("influencers").delete().eq("id", id);
    fetchData();
  }

  const filtered = influencers.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المشاهير والمؤثرون</h1>
          <p className="text-sm text-gray-500 mt-0.5">{influencers.length} مؤثر</p>
        </div>
        <button onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus className="w-4 h-4" /> إضافة مشهور
        </button>
      </div>

      {showManual && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إضافة مشهور جديد</h2>
          <form onSubmit={addManual} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "name", label: "الاسم *", type: "text", placeholder: "اسم المشهور" },
              { key: "amount", label: "المبلغ (ر.س) *", type: "number", placeholder: "0" },
              { key: "email", label: "الإيميل *", type: "email", placeholder: "example@email.com" },
              { key: "whatsapp", label: "واتساب", type: "text", placeholder: "05xxxxxxxx" },
              { key: "iban", label: "IBAN", type: "text", placeholder: "SA..." },
              { key: "bank_name", label: "البنك", type: "text", placeholder: "اسم البنك" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required={f.label.includes("*")}
                  value={(manualForm as any)[f.key]} onChange={e => setManualForm({ ...manualForm, [f.key]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الحملة</label>
              <select value={manualForm.campaign_id} onChange={e => setManualForm({ ...manualForm, campaign_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">بدون حملة</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium">
                <Plus className="w-4 h-4" /> إضافة
              </button>
              <button type="button" onClick={() => setShowManual(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا يوجد مشاهير</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المشهور</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الإيميل</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">IBAN</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inf => {
                const sc = statusConfig[inf.status] || statusConfig.pending;
                const isEditing = editingId === inf.id;
                return (
                  <tr key={inf.id} className={`border-t border-gray-50 transition ${isEditing ? "bg-blue-50/30" : "hover:bg-gray-50/50"}`}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                            {inf.name?.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800">{inf.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                          className="w-24 px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none" />
                      ) : (
                        <span className="font-semibold">{inf.amount?.toLocaleString("ar-SA")} ر.س</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none" />
                      ) : (
                        <span className="text-xs text-gray-500">{inf.email || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input value={editForm.iban} onChange={e => setEditForm({ ...editForm, iban: e.target.value })}
                          className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none" placeholder="SA..." />
                      ) : (
                        <span className="text-xs text-gray-500">{inf.iban || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(inf.id)}
                              className="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg">
                              <Check className="w-3 h-3" /> حفظ
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
                              <X className="w-3 h-3" /> إلغاء
                            </button>
                          </>
                        ) : (
                          <>
                            {inf.status === "pending" && (
                              <button onClick={() => requestTransfer(inf.id)}
                                className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition">
                                <Send className="w-3 h-3" /> طلب تحويل
                              </button>
                            )}
                            <button onClick={() => startEdit(inf)}
                              className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition">
                              <Pencil className="w-3 h-3" /> تعديل
                            </button>
                            <button onClick={() => deleteInfluencer(inf.id)}
                              className="text-gray-300 hover:text-red-500 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
