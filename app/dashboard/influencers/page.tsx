"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Upload, Loader2, Users, Search, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Influencer, Campaign } from "@/types";

type Status = "pending" | "processing" | "paid";

const statusConfig: Record<Status, { label: string; color: string; icon: any }> = {
  pending: { label: "بانتظار التحويل", color: "bg-amber-100 text-amber-700", icon: Clock },
  processing: { label: "جارٍ التحويل", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  paid: { label: "محوّل", color: "bg-green-100 text-green-700", icon: CheckCircle },
};

export default function InfluencersPage() {
  const supabase = createClient();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [addingAll, setAddingAll] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", amount: "", iban: "", bank_name: "", campaign_id: "" });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [{ data: inf }, { data: camp }] = await Promise.all([
      supabase.from("influencers").select("*, campaign:campaigns(name)").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("id, name").eq("status", "active"),
    ]);
    setInfluencers((inf || []) as Influencer[]);
    setCampaigns((camp || []) as Campaign[]);
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setExtracted([]);

    const readAsText = (f: File) => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("read failed"));
      r.readAsText(f, "utf-8");
    });

    try {
      const htmlContent = await readAsText(file);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `استخرج من هذه الفاتورة بيانات جميع المؤثرين. أجب فقط بـ JSON بدون أي نص أو backticks:\n{"influencers":[{"name":"الاسم","amount":0,"iban":"","bank_name":""}]}. المبلغ رقم فقط بدون عملة. إذا لم تجد IBAN أو بنك اتركها فارغة.\n\nمحتوى الفاتورة:\n${htmlContent.slice(0, 8000)}`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.map((c: any) => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setExtracted(parsed.influencers || []);
    } catch {
      alert("تعذّر تحليل الفاتورة. تأكد أن الملف يحتوي نصاً واضحاً.");
    }
    setUploading(false);
  }

  async function addAllExtracted() {
    if (!selectedCampaign) { alert("اختر الحملة أولاً"); return; }
    setAddingAll(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("influencers").insert(
      extracted.map(inf => ({
        name: inf.name,
        amount: parseFloat(inf.amount) || 0,
        iban: inf.iban || "",
        bank_name: inf.bank_name || "",
        status: "pending",
        campaign_id: selectedCampaign,
        added_by: user?.id,
      }))
    );
    setExtracted([]);
    setShowUpload(false);
    setAddingAll(false);
    fetchData();
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
      status: "pending",
      added_by: user?.id,
    });
    setManualForm({ name: "", amount: "", iban: "", bank_name: "", campaign_id: "" });
    setShowManual(false);
    fetchData();
  }

  const filtered = influencers.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المؤثرون</h1>
          <p className="text-sm text-gray-500 mt-0.5">{influencers.length} مؤثر</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition">
            <Upload className="w-4 h-4" /> رفع فاتورة HTML
          </button>
          <button onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Plus className="w-4 h-4" /> إضافة يدوية
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">استخراج المؤثرين من فاتورة PDF</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الحملة</label>
              <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">اختر الحملة</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ملف PDF</label>
              <label className="flex items-center gap-2 w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 cursor-pointer transition">
                <Upload className="w-4 h-4" />
                {uploading ? "جارٍ تحليل الفاتورة..." : "اختر ملف PDF"}
                <input type="file" accept=".html,.htm" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {uploading && (
            <div className="flex items-center gap-3 text-blue-600 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> الذكاء الاصطناعي يحلل الفاتورة...
            </div>
          )}

          {extracted.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">تم استخراج {extracted.length} مؤثر</p>
                <button onClick={addAllExtracted} disabled={addingAll || !selectedCampaign}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60">
                  {addingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إضافة الجميع
                </button>
              </div>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">الاسم</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ (ر.س)</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">IBAN</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">البنك</th>
                  </tr></thead>
                  <tbody>{extracted.map((inf, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-4 py-3 font-medium">{inf.name}</td>
                      <td className="px-4 py-3">{Number(inf.amount).toLocaleString("ar-SA")}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{inf.iban || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{inf.bank_name || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showManual && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إضافة مؤثر يدوياً</h2>
          <form onSubmit={addManual} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "name", label: "الاسم *", type: "text", placeholder: "اسم المؤثر" },
              { key: "amount", label: "المبلغ (ر.س) *", type: "number", placeholder: "0" },
              { key: "iban", label: "IBAN", type: "text", placeholder: "SA..." },
              { key: "bank_name", label: "اسم البنك", type: "text", placeholder: "مثال: الأهلي" },
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
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition">
                <Plus className="w-4 h-4" /> إضافة
              </button>
              <button type="button" onClick={() => setShowManual(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن مؤثر..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا يوجد مؤثرون</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-right px-5 py-3 font-medium text-gray-600">المؤثر</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">الحملة</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">المبلغ</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">البنك / IBAN</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">الحالة</th>
            </tr></thead>
            <tbody>
              {filtered.map(inf => {
                const sc = statusConfig[inf.status as Status] || statusConfig.pending;
                const Icon = sc.icon;
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
                    <td className="px-5 py-3 text-gray-500">{(inf as any).campaign?.name || "—"}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{inf.amount.toLocaleString("ar-SA")} ر.س</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{inf.bank_name || "—"} {inf.iban ? `• ${inf.iban.slice(0, 12)}...` : ""}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>
                        <Icon className="w-3 h-3" />{sc.label}
                      </span>
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
