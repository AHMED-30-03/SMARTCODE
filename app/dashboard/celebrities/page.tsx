"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Loader2, Users, Search, Pencil, X, Check, Trash2 } from "lucide-react";

export default function CelebritiesPage() {
  const supabase = createClient();
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", iban: "", bank_name: "", notes: "" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user!.id).single();
    setCompanyId(profile?.company_id);

    let query = supabase.from("celebrities").select("*").order("name");
    if (profile?.role !== "super_admin" && profile?.company_id) {
      query = query.eq("company_id", profile.company_id);
    }
    const { data } = await query;
    setCelebrities(data || []);
    setLoading(false);
  }

  async function addCelebrity(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("celebrities").insert({ ...form, company_id: companyId, added_by: user?.id });
    setForm({ name: "", email: "", whatsapp: "", iban: "", bank_name: "", notes: "" });
    setShowForm(false);
    fetchData();
  }

  function startEdit(cel: any) {
    setEditingId(cel.id);
    setEditForm({ name: cel.name, email: cel.email || "", whatsapp: cel.whatsapp || "", iban: cel.iban || "", bank_name: cel.bank_name || "", notes: cel.notes || "" });
  }

  async function saveEdit(id: string) {
    await supabase.from("celebrities").update(editForm).eq("id", id);
    setEditingId(null);
    fetchData();
  }

  async function deleteCelebrity(id: string) {
    if (!confirm("هل تريد حذف هذا المشهور؟")) return;
    await supabase.from("celebrities").delete().eq("id", id);
    fetchData();
  }

  const filtered = celebrities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const fields = [
    { key: "name", label: "الاسم *", type: "text", placeholder: "اسم المشهور" },
    { key: "email", label: "الإيميل", type: "email", placeholder: "example@email.com" },
    { key: "whatsapp", label: "واتساب", type: "text", placeholder: "05xxxxxxxx" },
    { key: "iban", label: "IBAN", type: "text", placeholder: "SA..." },
    { key: "bank_name", label: "البنك", type: "text", placeholder: "اسم البنك" },
    { key: "notes", label: "ملاحظات", type: "text", placeholder: "اختياري" },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المشاهير</h1>
          <p className="text-sm text-gray-500 mt-0.5">{celebrities.length} مشهور مسجّل</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{ backgroundColor: "#5BB8E8" }}>
          <Plus className="w-4 h-4" /> إضافة مشهور
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إضافة مشهور جديد</h2>
          <form onSubmit={addCelebrity} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required={f.label.includes("*")}
                  value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8E8] transition" />
              </div>
            ))}
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="flex items-center gap-2 text-white px-5 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: "#5BB8E8" }}>
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8E8]" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#5BB8E8" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا يوجد مشاهير</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">المشهور</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الإيميل</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">واتساب</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">IBAN</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">البنك</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
            </tr></thead>
            <tbody>
              {filtered.map(cel => {
                const isEditing = editingId === cel.id;
                return (
                  <tr key={cel.id} className={`border-t border-gray-50 transition ${isEditing ? "bg-blue-50/30" : "hover:bg-gray-50/50"}`}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white" style={{ backgroundColor: "#5BB8E8" }}>
                            {cel.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800">{cel.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{isEditing ? <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm" /> : <span className="text-xs text-gray-500">{cel.email || "—"}</span>}</td>
                    <td className="px-4 py-3">{isEditing ? <input value={editForm.whatsapp} onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })} className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm" /> : <span className="text-xs text-gray-500">{cel.whatsapp || "—"}</span>}</td>
                    <td className="px-4 py-3">{isEditing ? <input value={editForm.iban} onChange={e => setEditForm({ ...editForm, iban: e.target.value })} className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm" /> : <span className="text-xs text-gray-500">{cel.iban || "—"}</span>}</td>
                    <td className="px-4 py-3">{isEditing ? <input value={editForm.bank_name} onChange={e => setEditForm({ ...editForm, bank_name: e.target.value })} className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm" /> : <span className="text-xs text-gray-500">{cel.bank_name || "—"}</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(cel.id)} className="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg"><Check className="w-3 h-3" /> حفظ</button>
                            <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg"><X className="w-3 h-3" /> إلغاء</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(cel)} className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg"><Pencil className="w-3 h-3" /> تعديل</button>
                            <button onClick={() => deleteCelebrity(cel.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
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
