"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Send, Loader2, CheckCircle, X } from "lucide-react";
import { Influencer } from "@/types";

export default function TransfersPage() {
  const supabase = createClient();
  const [pending, setPending] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Influencer | null>(null);
  const [form, setForm] = useState({ iban: "", bank_name: "", transfer_ref: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { fetchPending(); }, []);

  async function fetchPending() {
    const { data } = await supabase.from("influencers")
      .select("*, campaign:campaigns(name)")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false });
    setPending(data || []);
    setLoading(false);
  }

  function openTransfer(inf: Influencer) {
    setSelected(inf);
    setForm({ iban: inf.iban || "", bank_name: inf.bank_name || "", transfer_ref: `TXN-${Date.now().toString().slice(-8)}`, notes: "" });
    setSuccess(null);
  }

  async function confirmTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("influencers").update({
      status: "paid",
      iban: form.iban,
      bank_name: form.bank_name,
    }).eq("id", selected.id);

    const receiptNum = `RCP-${Date.now().toString().slice(-6)}`;
    const { data: receipt } = await supabase.from("receipts").insert({
      influencer_id: selected.id,
      receipt_number: receiptNum,
      amount: selected.amount,
      transfer_ref: form.transfer_ref,
      bank_name: form.bank_name,
      iban: form.iban,
      notes: form.notes,
      created_by: user?.id,
    }).select().single();

    setSaving(false);
    setSuccess(receiptNum);
    fetchPending();
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">التحويلات المالية</h1>
        <p className="text-sm text-gray-500 mt-0.5">{pending.length} تحويل بانتظار المعالجة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-semibold text-gray-700 text-sm">بانتظار التحويل</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-300" />
              <p className="text-sm">جميع التحويلات مكتملة!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pending.map(inf => (
                <div key={inf.id} className={`p-4 hover:bg-gray-50/50 transition cursor-pointer flex items-center justify-between ${selected?.id === inf.id ? "bg-blue-50/30 border-r-2 border-blue-500" : ""}`}
                  onClick={() => openTransfer(inf)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-semibold text-sm shrink-0">
                      {inf.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{inf.name}</p>
                      <p className="text-xs text-gray-400">{(inf as any).campaign?.name || "بدون حملة"}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{inf.amount.toLocaleString("ar-SA")}</p>
                    <p className="text-xs text-gray-400">ر.س</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">تم التحويل بنجاح!</h3>
              <p className="text-sm text-gray-500 mb-1">رقم الإيصال</p>
              <p className="font-mono text-blue-600 font-bold text-lg">{success}</p>
              <button onClick={() => { setSelected(null); setSuccess(null); }}
                className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                تحويل آخر
              </button>
            </div>
          ) : selected ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800">تفاصيل التحويل</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-gradient-to-l from-blue-50 to-indigo-50 rounded-xl p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{selected.name}</p>
                  <p className="text-sm text-gray-500">{(selected as any).campaign?.name || "بدون حملة"}</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-blue-700">{selected.amount.toLocaleString("ar-SA")}</p>
                  <p className="text-sm text-blue-500">ريال سعودي</p>
                </div>
              </div>

              <form onSubmit={confirmTransfer} className="space-y-4">
                {[
                  { key: "iban", label: "IBAN / رقم الحساب", placeholder: "SA..." },
                  { key: "bank_name", label: "اسم البنك", placeholder: "مثال: البنك الأهلي" },
                  { key: "transfer_ref", label: "رقم المرجع", placeholder: "TXN-..." },
                  { key: "notes", label: "ملاحظات", placeholder: "اختياري" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                    <input placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                ))}

                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium transition disabled:opacity-60 mt-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  تأكيد التحويل وإصدار الإيصال
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">اختر مؤثراً من القائمة لبدء التحويل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
