"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Loader2, Users } from "lucide-react";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "مدير النظام",
  campaign_manager: "مدير حملات",
  accountant: "محاسب",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  campaign_manager: "bg-sky-100 text-sky-700",
  accountant: "bg-gray-100 text-gray-600",
};

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "campaign_manager", company_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentProfile, setCurrentProfile] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("*, company:companies(*)").eq("id", user!.id).single();
    setCurrentProfile(profile);

    const { data: comp } = await supabase.from("companies").select("*").order("name");
    setCompanies(comp || []);

    let query = supabase.from("profiles").select("*, company:companies(name)").order("created_at", { ascending: false });
    if (profile?.role !== "super_admin" && profile?.company_id) {
      query = query.eq("company_id", profile.company_id);
    }
    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name, role: form.role } },
      });
      if (signUpError) throw signUpError;
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          company_id: form.company_id || currentProfile?.company_id || null,
        });
      }
      setForm({ email: "", password: "", full_name: "", role: "campaign_manager", company_id: "" });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    }
    setSaving(false);
  }

  async function updateRole(userId: string, role: string) {
    await supabase.from("profiles").update({ role }).eq("id", userId);
    fetchData();
  }

  async function updateCompany(userId: string, company_id: string) {
    await supabase.from("profiles").update({ company_id }).eq("id", userId);
    fetchData();
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المستخدمون</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} مستخدم</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{ backgroundColor: "#5BB8E8" }}>
          <Plus className="w-4 h-4" /> إضافة مستخدم
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إنشاء حساب جديد</h2>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "full_name", label: "الاسم الكامل *", type: "text", placeholder: "محمد أحمد" },
              { key: "email", label: "البريد الإلكتروني *", type: "email", placeholder: "user@company.com" },
              { key: "password", label: "كلمة المرور *", type: "password", placeholder: "6 أحرف على الأقل" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8E8]" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الصلاحية *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8E8]">
                <option value="campaign_manager">مدير حملات</option>
                <option value="accountant">محاسب</option>
                <option value="admin">مدير النظام</option>
                {currentProfile?.role === "super_admin" && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
            {currentProfile?.role === "super_admin" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الشركة</label>
                <select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8E8]">
                  <option value="">اختر الشركة</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {error && <div className="md:col-span-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: "#5BB8E8" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إنشاء
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#5BB8E8" }} /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا يوجد مستخدمون</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-right px-5 py-3 font-medium text-gray-600">المستخدم</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">البريد</th>
              {currentProfile?.role === "super_admin" && <th className="text-right px-5 py-3 font-medium text-gray-600">الشركة</th>}
              <th className="text-right px-5 py-3 font-medium text-gray-600">الصلاحية</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 text-white" style={{ backgroundColor: "#5BB8E8" }}>
                        {(u.full_name || u.email)?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  {currentProfile?.role === "super_admin" && (
                    <td className="px-5 py-3">
                      <select value={u.company_id || ""} onChange={e => updateCompany(u.id, e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 cursor-pointer">
                        <option value="">بدون شركة</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border-0 cursor-pointer ${roleColors[u.role] || "bg-gray-100 text-gray-600"}`}>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">مدير النظام</option>
                      <option value="campaign_manager">مدير حملات</option>
                      <option value="accountant">محاسب</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
