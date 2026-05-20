"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Send, Loader2, CheckCircle, X, Upload, Mail } from "lucide-react";

export default function TransfersPage() {
  const supabase = createClient();
  const [requested, setRequested] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ iban: "", bank_name: "", transfer_ref: "", notes: "" });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchRequested(); }, []);

  async function fetchRequested() {
    const { data } = await supabase.from("influencers")
      .select("*, campaign:campaigns(name)")
      .in("status", ["requested", "processing"])
      .order("created_at", { ascending: false });
    setRequested(data || []);
    setLoading(false);
  }

  function openTransfer(inf: any) {
    setSelected(inf);
    setForm({ iban: inf.iban || "", bank_name: inf.bank_name || "", transfer_ref: `TXN-${Date.now().toString().slice(-8)}`, notes: "" });
    setReceiptFile(null);
    setSuccess(null);
  }

  async function confirmTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("influencers").update({
      status: "paid", iban: form.iban, bank_name: form.bank_name,
    }).eq("id", selected.id);

    const receiptNum = `RCP-${Date.now().toString().slice(-6)}`;
    let receiptBase64 = "";

    if (receiptFile) {
      receiptBase64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej();
        r.readAsDataURL(receiptFile);
      });
    }

    await supabase.from("receipts").insert({
      influencer_id: selected.id,
      receipt_number: receiptNum,
      amount: selected.amount,
      transfer_ref: form.transfer_ref,
      bank_name: form.bank_name,
      iban: form.iban,
      notes: form.notes,
      receipt_pdf: receiptBase64,
      created_by: user?.id,
    });

    setSaving(false);

    if (selected.email) {
      setSending(true);
      await sendReceiptEmail({
        to: selected.email,
        name: selected.name,
        amount: selected.amount,
        receiptNum,
        transferRef: form.transfer_ref,
        bank: form.bank_name,
        iban: form.iban,
        date: new Date().toLocaleDateString("ar-SA"),
      });
      setSending(false);
    }

    setSuccess(receiptNum);
    fetchRequested();
  }

  async function sendReceiptEmail(data: any) {
    try {
      await fetch("/api/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Email send failed", e);
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">التحويلات المالية</h1>
        <p className="text-sm text-gray-500 mt-0.5">{requested.length} طلب بانتظار المعالجة</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-semibold text-gray-700 text-sm">طلبات التحويل</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : requested.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-300" />
              <p className="text-sm">لا توجد طلبات تحويل</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {requested.map(inf => (
                <div key={inf.id} onClick={() => openTransfer(inf)}
                  className={`p-4 hover:bg-gray-50/50 transition cursor-pointer flex items-center justify-between ${selected?.id === inf.id ? "bg-blue-50/30 border-r-2 border-blue-500" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm shrink-0">
                      {inf.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{inf.name}</p>
                      <p className="text-xs text-gray-400">{inf.email || "بدون إيميل"}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{inf.amount?.toLocaleString("ar-SA")}</p>
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
              <p className="font-mono text-blue-600 font-bold text-lg mb-2">{success}</p>
              {selected?.email && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                  <Mail className="w-4 h-4" />
                  تم إرسال الإيصال على {selected.email}
                </div>
              )}
              <button onClick={() => { setSelected(null); setSuccess(null); }}
                className="mt-5 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                تحويل آخر
              </button>
            </div>
          ) : selected ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800">تفاصيل التحويل</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-gradient-to-l from-blue-50 to-indigo-50 rounded-xl p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{selected.name}</p>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-blue-700">{selected.amount?.toLocaleString("ar-SA")}</p>
                  <p className="text-sm text-blue-500">ريال سعودي</p>
                </div>
              </div>
              <form onSubmit={confirmTransfer} className="space-y-4">
                {[
                  { key: "iban", label: "IBAN", placeholder: "SA..." },
                  { key: "bank_name", label: "اسم البنك", placeholder: "البنك الأهلي" },
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">إيصال التحويل PDF</label>
                  <label className="flex items-center gap-2 w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    {receiptFile ? receiptFile.name : "ارفع إيصال التحويل من البنك"}
                    <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
                      onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <button type="submit" disabled={saving || sending}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium transition disabled:opacity-60">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</> :
                   sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإرسال...</> :
                   <><Send className="w-4 h-4" /> تأكيد وإرسال الإيصال</>}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">اختر طلباً من القائمة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
