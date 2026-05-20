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
  const [assignments, setAssignments] = useState<Record<number, { celebrity_id: string; campaign_id: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

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

    const get = (tag: string) => doc.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim() || "";
    const getAttr = (tag: string, attr: string) => doc.getElementsByTagNameNS("*", tag)[0]?.getAttribute(attr) || "";

    const invoiceNumber = get("ID") || "";
    const issueDate = get("IssueDate") || "";

    // Supplier
    const supplierParty = doc.getElementsByTagNameNS("*", "AccountingSupplierParty")[0];
    const supplier = supplierParty?.getElementsByTagNameNS("*", "RegistrationName")[0]?.textContent?.trim() || "";
    const supplierTax = supplierParty?.getElementsByTagNameNS("*", "CompanyID")[0]?.textContent?.trim() || "";

    // Customer
    const customerParty = doc.getElementsByTagNameNS("*", "AccountingCustomerParty")[0];
    const customer = customerParty?.getElementsByTagNameNS("*", "RegistrationName")[0]?.textContent?.trim() || "";
    const customerTax = customerParty?.getElementsByTagNameNS("*", "CompanyID")[0]?.textContent?.trim() || "";

    // Items
    const invoiceLines = doc.getElementsByTagNameNS("*", "InvoiceLine");
    const items = Array.from(invoiceLines).map(line => {
      const name = line.getElementsByTagNameNS("*", "Name")[0]?.textContent?.trim() || "";
      const quantity = parseFloat(line.getElementsByTagNameNS("*", "InvoicedQuantity")[0]?.textContent || "1");
      const price = parseFloat(line.getElementsByTagNameNS("*", "PriceAmount")[0]?.textContent || "0");
      const total = parseFloat(line.getElementsByTagNameNS("*", "LineExtensionAmount")[0]?.textContent || "0");
      const tax = parseFloat(line.getElementsByTagNameNS("*", "TaxAmount")[0]?.textContent || "0");
      return { name, quantity, price, total, tax };
    });

    // Totals
    const legalTotal = doc.getElementsByTagNameNS("*", "LegalMonetaryTotal")[0];
    const totalExcl = parseFloat(legalTotal?.getElementsByTagNameNS("*", "TaxExclusiveAmount")[0]?.textContent || "0");
    const totalIncl = parseFloat(legalTotal?.getElementsByTagNameNS("*", "PayableAmount")[0]?.textContent || "0");
    const totalTax = parseFloat(doc.getElementsByTagNameNS("*", "TaxAmount")[0]?.textContent || "0");

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
      // init assignments
      const init: Record<number, { celebrity_id: string; campaign_id: string }> = {};
      data.items.forEach((_, i) => { init[i] = { celebrity_id: "", campaign_id: "" }; });
      setAssignments(init);
    } catch {
      alert("تعذّر قراءة الفاتورة");
    }
    setLoading(false);
  }

  async function saveInvoice() {
    if (!invoiceData) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Save invoice
    const { data: inv } = await supabase.from("invoices").insert({
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
    }).select().single();

    // Save contracts for assigned items
    for (const [idx, assignment] of Object.entries(assignments)) {
      if (assignment.celebrity_id) {
        const item = invoiceData.items[parseInt(idx)];
        await supabase.from("contracts").insert({
          celebrity_id: assignment.celebrity_id,
          campaign_id: assignment.campaign_id || null,
          amount: item.total,
          notes: `${item.name} - فاتورة ${invoiceData.invoiceNumber}`,
          status: "pending",
          added_by: user?.id,
        });
      }
    }

    setSaving(false);
    setSaved(true);
    setInvoiceData(null);
    fetchInvoices();
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
        <div className="flex items-center gap-3 bg-green-50 text-green-700 px-5 py-4 rounded-2xl mb-6">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">تم حفظ الفاتورة وإنشاء العقود بنجاح!</span>
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

          {/* Items + assignment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" /> المنتجات / المشاهير
            </h2>
            <div className="space-y-4">
              {invoiceData.items.map((item, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        الكمية: {item.quantity} × {item.price.toLocaleString("ar-SA")} ر.س
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-800">{item.total.toLocaleString("ar-SA")} ر.س</p>
                      <p className="text-xs text-gray-400">+ ضريبة {item.tax.toLocaleString("ar-SA")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">اربط بمشهور</label>
                      <select value={assignments[i]?.celebrity_id || ""}
                        onChange={e => setAssignments({ ...assignments, [i]: { ...assignments[i], celebrity_id: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">بدون مشهور</option>
                        {celebrities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">الحملة</label>
                      <select value={assignments[i]?.campaign_id || ""}
                        onChange={e => setAssignments({ ...assignments, [i]: { ...assignments[i], campaign_id: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">بدون حملة</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={saveInvoice} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition mt-5 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              حفظ الفاتورة وإنشاء العقود
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
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-blue-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.customer}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.issue_date}</td>
                  <td className="px-4 py-3 font-semibold">{inv.total_incl?.toLocaleString("ar-SA")} ر.س</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
