"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Users, DollarSign, Clock, CheckCircle, Plus, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { Campaign, Influencer } from "@/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار التحويل", color: "bg-amber-100 text-amber-700" },
  processing: { label: "جارٍ التحويل", color: "bg-blue-100 text-blue-700" },
  paid: { label: "محوّل", color: "bg-green-100 text-green-700" },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", iban: "", bank_name: "" });

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    const [{ data: camp }, { data: inf }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("influencers").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    ]);
    setCampaign(camp);
    setInfluencers(inf || []);
    setLoading(false);
  }

  async function addInfluencer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("influencers").insert({
      name: form.name,
      amount: parseFloat(form.amount) || 0,
      iban: form.iban,
      bank_name: form.bank_name,
      campaign_id: id,
      status: "pending",
      added_by: user?.id,
    });
    setForm({ name: "", amount: "", iban: "", bank_name: "" });
    setShowForm(false);
    setSaving(false);
    fetchData();
  }

  async function deleteInfluencer(infId: string) {
    if (!confirm("هل تريد حذف هذا المؤثر؟")) return;
    await supabase.from("influencers").delete().eq("id", infId);
    fetchData();
  }

  async function updateStatus(infId: string, status: string) {
    await supabase.from("campaigns").update({ status }).eq("id", id);
    fetchData();
  }

  const totalAmount = influencers.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmount = influencers.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const pendingCount = influencers.filter(i => i.status === "pending").length;
  const paidCount = influencers.filter(i => i.status === "paid").length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (!campaign) return (
    <div className="p-6 text-center text-gray-500">الحملة غير موجودة</div>
  );

  return (
    <div className="p-6 max-w-5xl">
      <button onClick={() => router.push("/dashboard/campaigns")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5 transition">
        <ArrowRight className="w-4 h-4" /> العودة للحملات
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
          {campaign.description && <p className="text-gray-500 text-sm mt-1">{campaign.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select value={campaign.status} onChange={e => updateStatus(id, e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border-0 cursor-pointer ${
              campaign.status === "active" ? "bg-green-100 text-green-700" :
              campaign.status === "completed" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"
            }`}>
            <option value="active">نشطة</option>
            <option value="paused">متوقفة</option>
            <option value="completed">مكتملة</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "إجمالي المؤثرين", value: influencers.length, icon: Users, color: "bg-blue-50 text-blue-600" },
          { label: "إجمالي المبالغ", value: `${totalAmount.toLocaleString("ar-SA")} ر.س`, icon: DollarSign, color: "bg-purple-50 text-purple-600" },
          { label: "بانتظار التحويل", value: pendingCount, icon: Clock, color: "bg-amber-50 text-amber-600" },
          { label: "تم التحويل", value: `${paidAmount.toLocaleString("ar-SA")} ر.س`, icon: CheckCircle, color: "bg-green-50 text-green-600" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إضافة مؤثر للحملة</h2>
          <form onSubmit={addInfluencer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "name", label: "اسم المؤثر *", type: "text", placeholder: "الاسم الكامل" },
              { key: "amount", label: "المبلغ (ر.س) *", type: "number", placeholder: "0" },
              { key: "iban", label: "IBAN", type: "text", placeholder: "SA..." },
              { key: "bank_name", label: "اسم البنك", type: "text", placeholder: "مثال: الأهلي" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required={f.label.includes("*")}
                  value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
            ))}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إضافة
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-800">المؤثرون ({influencers.length})</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Plus className="w-4 h-4" /> إضافة مؤثر
          </button>
        </div>

        {influencers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا يوجد مؤثرون في هذه الحملة بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-5 py-3 font-medium text-gray-600">المؤثر</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">المبلغ</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">البنك / IBAN</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {influencers.map(inf => {
                const sc = statusConfig[inf.status] || statusConfig.pending;
                return (
                  <tr key={inf.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs shrink-0">
                          {inf.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{inf.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold">{inf.amount.toLocaleString("ar-SA")} ر.س</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {inf.bank_name || "—"} {inf.iban ? `• ${inf.iban.slice(0, 10)}...` : ""}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => deleteInfluencer(inf.id)}
                        className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
