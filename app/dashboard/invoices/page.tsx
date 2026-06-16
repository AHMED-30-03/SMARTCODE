"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Upload, Loader2, FileText, Plus, CheckCircle, Building2, Hash, Package } from "lucide-react";

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
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedContracts, setSavedContracts] = useState<{name: string; amount: number; isNew: boolean}[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [sendingToQoyod, setSendingToQoyod] = useState<string | null>(null);
  const [qoyodSuccess, setQoyodSuccess] = useState<string | null>(null);

  useEffect(() => { fetchLists(); fetchInvoices(); }, []);

  async function fetchLists() {
    const [{ data: cel }, { data: cam }] = await Promise.all([
      supabase.from("celebrities").select("id, name").order("name"),
      supabase.from("campaigns").select("id, name").eq("status", "active"),
    ]);
    setCelebrities(cel || []);
    setCampaigns(cam || []);
  }

  async function fetchInvoices() {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(10);
    setInvoices(data || []);
  }

  function parseXML(xmlText: string): InvoiceData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    const CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    const CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";

    const root = doc.documentElement;

    // Get direct children only for invoice number and date
    const getDirectChild = (parent: Element, ns: string, tag: string) => {
      for (const child of Array.from(parent.childNodes)) {
        const el = child as Element;
        if (el.localName === tag && (el.namespaceURI === ns || !el.namespaceURI)) {
          return el.textContent?.trim() || "";
        }
      }
      return "";
    };

    const invoiceNumber = getDirectChild(root, CBC, "ID");
    const issueDate = getDirectChild(root, CBC, "IssueDate");

    // Supplier
    const supplierParty = doc.getElementsByTagNameNS(CAC, "AccountingSupplierParty")[0];
    const supplier = supplierParty?.getElementsByTagNameNS(CAC, "PartyLegalEntity")[0]
      ?.getElementsByTagNameNS(CBC, "RegistrationName")[0]?.textContent?.trim() || "";
    const supplierTax = supplierParty?.getElementsByTagNameNS(CAC, "PartyTaxScheme")[0]
      ?.getElementsByTagNameNS(CBC, "CompanyID")[0]?.textContent?.trim() || "";

    // Customer
    const customerParty = doc.getElementsByTagNameNS(CAC, "AccountingCustomerParty")[0];
    const customer = customerParty?.getElementsByTagNameNS(CAC, "PartyLegalEntity")[0]
      ?.getElementsByTagNameNS(CBC, "RegistrationName")[0]?.textContent?.trim() || "";
    const customerTax = customerParty?.getElementsByTagNameNS(CAC, "PartyTaxScheme")[0]
      ?.getElementsByTagNameNS(CBC, "CompanyID")[0]?.textContent?.trim() || "";

    // Items
    const invoiceLines = doc.getElementsByTagNameNS(CAC, "InvoiceLine");
    const items = Array.from(invoiceLines).map(line => {
      const name = line.getElementsByTagNameNS(CAC, "Item")[0]
        ?.getElementsByTagNameNS(CBC, "Name")[0]?.textContent?.trim() || "";
      const quantity = parseFloat(line.getElementsByTagNameNS(CBC, "InvoicedQuantity")[0]?.textContent || "1");
      const price = parseFloat(line.getElementsByTagNameNS(CAC, "Price")[0]
        ?.getElementsByTagNameNS(CBC, "PriceAmount")[0]?.textContent || "0");
      const total = parseFloat(line.getElementsByTagNameNS(CBC, "LineExtensionAmount")[0]?.textContent || "0");
      const taxTotal = line.getElementsByTagNameNS(CAC, "TaxTotal")[0];
      const tax = parseFloat(taxTotal?.getElementsByTagNameNS(CBC, "TaxAmount")[0]?.textContent || "0");
      return { name, quantity, price, total, tax };
    });

    // Totals
    const legalTotal = doc.getElementsByTagNameNS(CAC, "LegalMonetaryTotal")[0];
    const totalExcl = parseFloat(legalTotal?.getElementsByTagNameNS(CBC, "TaxExclusiveAmount")[0]?.textContent || "0");
    const totalIncl = parseFloat(legalTotal?.getElementsByTagNameNS(CBC, "PayableAmount")[0]?.textContent || "0");
    const taxTotals = doc.getElementsByTagNameNS(CAC, "TaxTotal");
    const totalTax = parseFloat(taxTotals[0]?.getElementsByTagNameNS(CBC, "TaxAmount")[0]?.textContent || "0");

    return { invoiceNumber, issueDate, supplier, supplierTax, customer, customerTax, items, totalExcl, totalTax, totalIncl };
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setInvoiceData(null);
    setSaved(false);

    const text = await file.text();
    try {
      const data = parseXML(text);
      setInvoiceData(data);
    } catch {
      alert("تعذّر قراءة الفاتورة");
    }
    setLoading(false);
  }

  async function saveInvoice() {
    if (!invoiceData) return;
    setSaving(true);

    // Check for duplicate
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_number", invoiceData.invoiceNumber)
      .single();

    if (existing) {
      alert(`الفاتورة ${invoiceData.invoiceNumber} محفوظة مسبقاً!`);
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Save invoice record
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
      created_by: user?.id,
    });

    const results: {name: string; amount: number; isNew: boolean}[] = [];

    // Auto-match each item to a celebrity by name
    for (const item of invoiceData.items) {
      // Search for celebrity by name (case-insensitive)
      const { data: found } = await supabase
        .from("celebrities")
        .select("id, name")
        .ilike("name", `%${item.name}%`)
        .limit(1);

      let celebrity_id = found?.[0]?.id;
      let isNew = false;

      // If not found, create new celebrity
      if (!celebrity_id) {
        const { data: newCel } = await supabase.from("celebrities").insert({
          name: item.name,
          added_by: user?.id,
        }).select().single();
        celebrity_id = newCel?.id;
        isNew = true;
      }

      if (celebrity_id) {
        // Create pending contract with amount BEFORE tax
        await supabase.from("contracts").insert({
          celebrity_id,
          amount: item.total, // before tax
          notes: `فاتورة ${invoiceData.invoiceNumber} - ${invoiceData.customer}`,
          status: "pending",
          added_by: user?.id,
        });
        results.push({ name: item.name, amount: item.total, isNew });
      }
    }

    setSaving(false);
    setSaved(true);
    setSavedContracts(results);
    setInvoiceData(null);
    fetchInvoices();
  }

  async function sendToQoyod(inv: any) {
    setSendingToQoyod(inv.id);
    setQoyodSuccess(null);
    try {
      const res = await fetch("/api/qoyod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: inv.invoice_number,
          issue_date: inv.issue_date,
          customer_name: inv.customer,
          items: [{ name: inv.customer, quantity: 1, price: inv.total_excl, total: inv.total_excl }],
          total_excl: inv.total_excl,
          total_tax: inv.total_tax,
          total_incl: inv.total_incl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQoyodSuccess(inv.id);
        // Update invoice as sent to qoyod
        const supabase = (await import("@/lib/supabase")).createClient();
        await supabase.from("invoices").update({ sent_to_qoyod: true, qoyod_type: "quotation" }).eq("id", inv.id);
        fetchInvoices();
      } else {
        alert("فشل الإرسال: " + JSON.stringify(data.error));
      }
    } catch (err) {
      alert("حدث خطأ أثناء الإرسال");
    }
    setSendingToQoyod(null);
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">فواتير المبيعات</h1>
        <p className="text-sm text-gray-500 mt-0.5">رفع فواتير XML واستخراج بيانات المشاهير تلقائياً</p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-blue-300 transition">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="font-medium text-gray-700">ارفع فاتورة XML</p>
            <p className="text-sm text-gray-400 mt-1">فاتورة ZATCA بصيغة UBL XML</p>
          </div>
          <input type="file" accept=".xml" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">جارٍ قراءة الفاتورة...</span>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 text-green-700 px-5 py-4 rounded-2xl mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">تم حفظ الفاتورة وإنشاء العقود تلقائياً!</span>
          </div>
          <div className="space-y-2">
            {savedContracts.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{c.name}</span>
                  {c.isNew && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">مشهور جديد</span>}
                </div>
                <span className="font-semibold text-green-700">{c.amount.toLocaleString("ar-SA")} ر.س</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoiceData && (
        <div className="space-y-5">
          {/* Invoice header */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> بيانات الفاتورة
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "رقم الفاتورة", value: invoiceData.invoiceNumber, icon: Hash },
                { label: "تاريخ الإصدار", value: invoiceData.issueDate, icon: FileText },
                { label: "المورد", value: invoiceData.supplier, icon: Building2 },
                { label: "الرقم الضريبي للمورد", value: invoiceData.supplierTax, icon: Hash },
                { label: "العميل", value: invoiceData.customer, icon: Building2 },
                { label: "الرقم الضريبي للعميل", value: invoiceData.customerTax, icon: Hash },
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

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" /> المشاهير / المنتجات
            </h2>
            <div className="space-y-3 mb-5">
              {invoiceData.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">الكمية: {item.quantity} × {item.price.toLocaleString("ar-SA")} ر.س</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-blue-700">{item.total.toLocaleString("ar-SA")} ر.س</p>
                    <p className="text-xs text-gray-400">+ ضريبة {item.tax.toLocaleString("ar-SA")}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm text-blue-700">
              سيتم البحث عن كل مشهور باسمه تلقائياً — وإنشاؤه إذا لم يكن موجوداً
            </div>
            <button onClick={saveInvoice} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition disabled:opacity-60">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ المعالجة...</> : <><Plus className="w-4 h-4" /> حفظ وإنشاء العقود تلقائياً</>}
            </button>
          </div>
        </div>
      )}

      {/* Previous invoices */}
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
                  <td className="px-4 py-3 font-mono text-blue-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.customer}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.issue_date}</td>
                  <td className="px-4 py-3 font-semibold">{inv.total_incl?.toLocaleString("ar-SA")} ر.س</td>
                  <td className="px-4 py-3">
                    {inv.sent_to_qoyod ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✓ أُرسلت لقيود</span>
                    ) : (
                      <button onClick={() => sendToQoyod(inv)} disabled={sendingToQoyod === inv.id}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition disabled:opacity-60 flex items-center gap-1">
                        {sendingToQoyod === inv.id ? "جارٍ الإرسال..." : "إرسال عرض سعر لقيود"}
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
