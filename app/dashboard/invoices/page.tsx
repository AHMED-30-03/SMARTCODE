"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Upload, Loader2, FileText, Plus, CheckCircle, Building2, Hash, Package, Send } from "lucide-react";

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  supplier: string;
  supplierTax: string;
  customer: string;
  customerTax: string;
  items: { name: string; quantity: number; price: number; total: number; tax: number }[];
  totalExcl: number;
  totalTax: number;
  totalIncl: number;
}

export default function InvoicesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedContracts, setSavedContracts] = useState<{name: string; amount: number; isNew: boolean}[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sendingToQoyod, setSendingToQoyod] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"xml" | "pdf">("xml");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user!.id).single();
    setCompanyId(profile?.company_id);

    let query = supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(20);
    if (profile?.role !== "super_admin" && profile?.company_id) {
      query = query.eq("company_id", profile.company_id);
    }
    const { data } = await query;
    setInvoices(data || []);
  }

  function parseXML(xmlText: string): InvoiceData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    const CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
    const root = doc.documentElement;

    const getDirectChild = (parent: Element, ns: string, tag: string) => {
      for (const child of Array.from(parent.childNodes)) {
        const el = child as Element;
        if (el.localName === tag && (el.namespaceURI === ns || !el.namespaceURI)) return el.textContent?.trim() || "";
      }
      return "";
    };

    const invoiceNumber = getDirectChild(root, CBC, "ID");
    const issueDate = getDirectChild(root, CBC, "IssueDate");
    const supplierParty = doc.getElementsByTagNameNS(CAC, "AccountingSupplierParty")[0];
    const supplier = supplierParty?.getElementsByTagNameNS(CAC, "PartyLegalEntity")[0]?.getElementsByTagNameNS(CBC, "RegistrationName")[0]?.textContent?.trim() || "";
    const supplierTax = supplierParty?.getElementsByTagNameNS(CAC, "PartyTaxScheme")[0]?.getElementsByTagNameNS(CBC, "CompanyID")[0]?.textContent?.trim() || "";
    const customerParty = doc.getElementsByTagNameNS(CAC, "AccountingCustomerParty")[0];
    const customer = customerParty?.getElementsByTagNameNS(CAC, "PartyLegalEntity")[0]?.getElementsByTagNameNS(CBC, "RegistrationName")[0]?.textContent?.trim() || "";
    const customerTax = customerParty?.getElementsByTagNameNS(CAC, "PartyTaxScheme")[0]?.getElementsByTagNameNS(CBC, "CompanyID")[0]?.textContent?.trim() || "";
    const invoiceLines = doc.getElementsByTagNameNS(CAC, "InvoiceLine");
    const items = Array.from(invoiceLines).map(line => {
      const name = line.getElementsByTagNameNS(CAC, "Item")[0]?.getElementsByTagNameNS(CBC, "Name")[0]?.textContent?.trim() || "";
      const quantity = parseFloat(line.getElementsByTagNameNS(CBC, "InvoicedQuantity")[0]?.textContent || "1");
      const price = parseFloat(line.getElementsByTagNameNS(CAC, "Price")[0]?.getElementsByTagNameNS(CBC, "PriceAmount")[0]?.textContent || "0");
      const total = parseFloat(line.getElementsByTagNameNS(CBC, "LineExtensionAmount")[0]?.textContent || "0");
      const tax = parseFloat(line.getElementsByTagNameNS(CAC, "TaxTotal")[0]?.getElementsByTagNameNS(CBC, "TaxAmount")[0]?.textContent || "0");
      return { name, quantity, price, total, tax };
    });
    const legalTotal = doc.getElementsByTagNameNS(CAC, "LegalMonetaryTotal")[0];
    const totalExcl = parseFloat(legalTotal?.getElementsByTagNameNS(CBC, "TaxExclusiveAmount")[0]?.textContent || "0");
    const totalIncl = parseFloat(legalTotal?.getElementsByTagNameNS(CBC, "PayableAmount")[0]?.textContent || "0");
    const totalTax = parseFloat(doc.getElementsByTagNameNS(CAC, "TaxTotal")[0]?.getElementsByTagNameNS(CBC, "TaxAmount")[0]?.textContent || "0");
    return { invoiceNumber, issueDate, supplier, supplierTax, customer, customerTax, items, totalExcl, totalTax, totalIncl };
  }

  async function parsePDFWithAI(base64: string): Promise<InvoiceData> {
    const response = await fetch("/api/parse-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mediaType: "application/pdf" }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setInvoiceData(null);
    setSaved(false);

    try {
      if (fileType === "xml") {
        const text = await file.text();
        setInvoiceData(parseXML(text));
      } else {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(",")[1]);
          r.onerror = () => rej();
          r.readAsDataURL(file);
        });
        const data = await parsePDFWithAI(base64);
        setInvoiceData(data);
      }
    } catch {
      alert("تعذّر قراءة الفاتورة");
    }
    setLoading(false);
  }

  async function saveInvoice() {
    if (!invoiceData) return;
    setSaving(true);

    const { data: existing } = await supabase.from("invoices").select("id").eq("invoice_number", invoiceData.invoiceNumber).single();
    if (existing) { alert(`الفاتورة ${invoiceData.invoiceNumber} محفوظة مسبقاً!`); setSaving(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("invoices").insert({
      invoice_number: invoiceData.invoiceNumber,
      issue_date: invoiceData.issueDate,
      supplier: invoiceData.supplier,
      supplier_tax: invoiceData.supplierTax,
      customer: invoiceData.customer,
      customer_tax: invoiceData.customerTax,
      total_excl: invoiceData.totalExcl,
      total_tax: invoiceData.totalTax,
      total_incl: invoiceData.totalIncl,
      company_id: companyId,
      created_by: user?.id,
    });

    const results: {name: string; amount: number; isNew: boolean}[] = [];
    for (const item of invoiceData.items) {
      const { data: found } = await supabase.from("celebrities").select("id").ilike("name", `%${item.name}%`).limit(1);
      let celebrity_id = found?.[0]?.id;
      let isNew = false;
      if (!celebrity_id) {
        const { data: newCel } = await supabase.from("celebrities").insert({ name: item.name, company_id: companyId, added_by: user?.id }).select().single();
        celebrity_id = newCel?.id;
        isNew = true;
      }
      if (celebrity_id) {
        await supabase.from("contracts").insert({ celebrity_id, amount: item.total, notes: `فاتورة ${invoiceData.invoiceNumber}`, status: "pending", company_id: companyId, added_by: user?.id });
        results.push({ name: item.name, amount: item.total, isNew });
      }
    }

    setSaving(false);
    setSaved(true);
    setSavedContracts(results);
    setInvoiceData(null);
    fetchData();
  }

  async function sendToQoyod(inv: any) {
    setSendingToQoyod(inv.id);
    try {
      const res = await fetch("/api/qoyod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: inv.invoice_number,
          issue_date: inv.issue_date,
          customer_name: inv.customer,
          items: [{ name: inv.customer || "منتجات", quantity: 1, price: inv.total_excl, total: inv.total_excl }],
          total_excl: inv.total_excl,
          total_tax: inv.total_tax,
          total_incl: inv.total_incl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await supabase.from("invoices").update({ sent_to_qoyod: true }).eq("id", inv.id);
        fetchData();
      } else {
        alert("فشل الإرسال: " + JSON.stringify(data.error));
      }
    } catch { alert("حدث خطأ"); }
    setSendingToQoyod(null);
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">فواتير المبيعات</h1>
        <p className="text-sm text-gray-500 mt-0.5">رفع الفواتير وإرسالها لقيود</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex gap-3 mb-4">
          <button onClick={() => setFileType("xml")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${fileType === "xml" ? "text-white" : "bg-gray-100 text-gray-600"}`}
            style={fileType === "xml" ? { backgroundColor: "#5BB8E8" } : {}}>
            XML (ZATCA)
          </button>
          <button onClick={() => setFileType("pdf")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${fileType === "pdf" ? "text-white" : "bg-gray-100 text-gray-600"}`}
            style={fileType === "pdf" ? { backgroundColor: "#5BB8E8" } : {}}>
            PDF
          </button>
        </div>
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-[#5BB8E8] transition">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="font-medium text-gray-700">ارفع فاتورة {fileType === "xml" ? "XML" : "PDF"}</p>
            <p className="text-sm text-gray-400 mt-1">{fileType === "xml" ? "فاتورة ZATCA بصيغة UBL XML" : "فاتورة PDF — يستخرجها الذكاء الاصطناعي"}</p>
          </div>
          <input type="file" accept={fileType === "xml" ? ".xml" : ".pdf"} className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8" style={{ color: "#5BB8E8" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{fileType === "pdf" ? "الذكاء الاصطناعي يقرأ الفاتورة..." : "جارٍ القراءة..."}</span>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 text-green-700 px-5 py-4 rounded-2xl mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">تم حفظ الفاتورة!</span>
          </div>
          {savedContracts.length > 0 && (
            <div className="space-y-2">
              {savedContracts.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{c.name}</span>
                    {c.isNew && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">جديد</span>}
                  </div>
                  <span className="font-semibold text-green-700">{c.amount.toLocaleString("ar-SA")} ر.س</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {invoiceData && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: "#5BB8E8" }} /> بيانات الفاتورة
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "رقم الفاتورة", value: invoiceData.invoiceNumber },
                { label: "التاريخ", value: invoiceData.issueDate },
                { label: "المورد", value: invoiceData.supplier },
                { label: "الرقم الضريبي للمورد", value: invoiceData.supplierTax },
                { label: "العميل", value: invoiceData.customer },
                { label: "الرقم الضريبي للعميل", value: invoiceData.customerTax },
              ].map(f => (
                <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                  <p className="font-medium text-gray-800 text-sm">{f.value || "—"}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-500 mb-1">قبل الضريبة</p>
                <p className="font-bold text-blue-700">{invoiceData.totalExcl.toLocaleString("ar-SA")} ر.س</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-500 mb-1">الضريبة 15%</p>
                <p className="font-bold text-amber-700">{invoiceData.totalTax.toLocaleString("ar-SA")} ر.س</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-500 mb-1">الإجمالي</p>
                <p className="font-bold text-green-700">{invoiceData.totalIncl.toLocaleString("ar-SA")} ر.س</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: "#5BB8E8" }} /> المنتجات
            </h2>
            <div className="space-y-3 mb-5">
              {invoiceData.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">الكمية: {item.quantity} × {item.price.toLocaleString("ar-SA")} ر.س</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold" style={{ color: "#5BB8E8" }}>{item.total.toLocaleString("ar-SA")} ر.س</p>
                    <p className="text-xs text-gray-400">+ ضريبة {item.tax.toLocaleString("ar-SA")}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={saveInvoice} disabled={saving}
              className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl text-sm font-medium transition disabled:opacity-60"
              style={{ backgroundColor: "#5BB8E8" }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</> : <><Plus className="w-4 h-4" /> حفظ الفاتورة</>}
            </button>
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
          <h2 className="font-semibold text-gray-800 mb-4">الفواتير السابقة</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الفاتورة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العميل</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الإجمالي</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">قيود</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono" style={{ color: "#5BB8E8" }}>{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.customer}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.issue_date}</td>
                  <td className="px-4 py-3 font-semibold">{inv.total_incl?.toLocaleString("ar-SA")} ر.س</td>
                  <td className="px-4 py-3">
                    {inv.sent_to_qoyod ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✓ عرض سعر في قيود</span>
                    ) : (
                      <button onClick={() => sendToQoyod(inv)} disabled={sendingToQoyod === inv.id}
                        className="text-xs text-white px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                        style={{ backgroundColor: "#5BB8E8" }}>
                        {sendingToQoyod === inv.id ? "جارٍ..." : "إرسال لقيود"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
