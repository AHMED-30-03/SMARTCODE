"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Loader2, Users, Shield } from "lucide-react";
import { UserProfile, UserRole } from "@/types";

const roleLabels: Record<UserRole, string> = {
  admin: "مدير النظام",
  campaign_manager: "مدير حملات",
  accountant: "محاسب",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  campaign_manager: "bg-blue-100 text-blue-700",
  accountant: "bg-green-100 text-green-700",
};

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "campaign_manager" as UserRole });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
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
        });
      }
      setForm({ email: "", password: "", full_name: "", role: "campaign_manager" });
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    }
    setSaving(false);
  }

  async function updateRole(userId: string, role: UserRole) {
    await supabase.from("profiles").update({ role }).eq("id", userId);
    fetchUsers();
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المستخدمون</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} مستخدم</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus className="w-4 h-4" /> إضافة مستخدم
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إنشاء حساب جديد</h2>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل *</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="محمد أحمد" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="user@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="6 أحرف على الأقل" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الصلاحية *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="campaign_manager">مدير حملات</option>
                <option value="accountant">محاسب</option>
                <option value="admin">مدير النظام</option>
              </select>
            </div>
            {error && <div className="md:col-span-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إنشاء الحساب
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا يوجد مستخدمون</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-right px-5 py-3 font-medium text-gray-600">المستخدم</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">البريد</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">الصلاحية</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">تاريخ الإضافة</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs shrink-0">
                        {u.full_name?.charAt(0) || u.email?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value as UserRole)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border-0 cursor-pointer ${roleColors[u.role] || "bg-gray-100 text-gray-600"}`}>
                      <option value="admin">مدير النظام</option>
                      <option value="campaign_manager">مدير حملات</option>
                      <option value="accountant">محاسب</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
