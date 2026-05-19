"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Receipt, FileCheck, Loader2, Search, Download } from "lucide-react";

export default function ReceiptsPage() {
  const supabase = createClient();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchReceipts(); }, []);

  async function fetchReceipts() {
    const { data } = await supabase.from("receipts")
      .select("*, influencer:influencers(name, campaign_id, campaign:campaigns(name))")
      .order("created_at", { ascending: false });
    setReceipts(data || []);
    setLoading(false);
  }

  async function generatePDF(receipt: any) {
    setGenerating(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `أنشئ إيصال تحويل مالي رسمي بالعربية بصيغة HTML جاهز للطباعة. البيانات:
- رقم الإيصال: ${receipt.receipt_number}
- المؤثر: ${receipt.influencer?.name}
- المبلغ: ${receipt.amount?.toLocaleString("ar-SA")} ريال سعودي
- البنك: ${receipt.bank_name || "—"}
- IBAN: ${receipt.iban || "—"}
- رقم المرجع: ${receipt.transfer_ref || "—"}
- الملاحظات: ${receipt.notes || "—"}
- تاريخ الإصدار: ${new Date(receipt.created_at).toLocaleDateString("ar-SA")}
أجب فقط بكود HTML كامل بدون backticks يبدو احترافياً مع ترويسة الشركة وطابع "تم الدفع".`
          }]
        })
      });
      const data = await response.json();
      const html = data.content?.map((c: any) => c.text || "").join("") || "";
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${receipt.receipt_number}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("تعذّر توليد الإيصال");
    }
    setGenerating(false);
  }

  const filtered = receipts.filter(r =>
    r.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.influencer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">الإيصالات</h1>
        <p className="text-sm text-gray-500 mt-0.5">{receipts.length} إيصال</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم الإيصال أو اسم المؤثر..."
                className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>لا توجد إيصالات</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(r => (
                <div key={r.id} onClick={() => setSelected(r)}
                  className={`p-4 hover:bg-gray-50/50 transition cursor-pointer flex items-center justify-between ${selected?.id === r.id ? "bg-green-50/30 border-r-2 border-green-500" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{r.influencer?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.receipt_number}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800 text-sm">{r.amount?.toLocaleString("ar-SA")} ر.س</p>
                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {selected ? (
            <>
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileCheck className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-bold text-gray-800">{selected.receipt_number}</p>
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">مكتمل</span>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ["المؤثر", selected.influencer?.name],
                  ["الحملة", selected.influencer?.campaign?.name || "—"],
                  ["المبلغ", `${selected.amount?.toLocaleString("ar-SA")} ر.س`],
                  ["البنك", selected.bank_name || "—"],
                  ["IBAN", selected.iban || "—"],
                  ["المرجع", selected.transfer_ref || "—"],
                  ["التاريخ", new Date(selected.created_at).toLocaleDateString("ar-SA")],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-800 text-left max-w-[55%] truncate">{v}</span>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">{selected.notes}</div>
              )}
              <button onClick={() => generatePDF(selected)} disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition mt-4 disabled:opacity-60">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                تحميل إيصال PDF
              </button>
            </>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">اختر إيصالاً لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
