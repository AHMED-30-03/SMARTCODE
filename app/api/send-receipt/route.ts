import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, name, amount, receiptNum, transferRef, bank, iban, date } = body;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; direction: rtl; }
  .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; }
  .header { text-align: center; margin-bottom: 24px; }
  .logo { font-size: 20px; font-weight: 700; color: #1d4ed8; }
  .amount { text-align: center; padding: 20px; background: #eff6ff; border-radius: 10px; margin: 20px 0; }
  .amount-num { font-size: 32px; font-weight: 700; color: #1d4ed8; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .label { color: #64748b; font-size: 14px; }
  .value { font-weight: 500; font-size: 14px; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
  .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 500; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">SmartCode</div>
    <p style="color:#64748b;font-size:14px;margin-top:4px">إيصال تحويل مالي</p>
    <span class="badge">✓ تم الدفع</span>
  </div>
  <div class="amount">
    <div style="font-size:13px;color:#64748b;margin-bottom:4px">المبلغ المحوّل</div>
    <div class="amount-num">${amount?.toLocaleString("ar-SA")} ر.س</div>
  </div>
  <div class="row"><span class="label">المستفيد</span><span class="value">${name}</span></div>
  <div class="row"><span class="label">رقم الإيصال</span><span class="value" style="font-family:monospace">${receiptNum}</span></div>
  <div class="row"><span class="label">رقم المرجع</span><span class="value" style="font-family:monospace">${transferRef}</span></div>
  <div class="row"><span class="label">البنك</span><span class="value">${bank || "—"}</span></div>
  <div class="row"><span class="label">IBAN</span><span class="value" style="font-family:monospace;font-size:12px">${iban || "—"}</span></div>
  <div class="row" style="border:none"><span class="label">التاريخ</span><span class="value">${date}</span></div>
  <div class="footer">SmartCode • هذا الإيصال صادر تلقائياً من النظام</div>
</div>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `إيصال تحويل - ${receiptNum}`,
      html: htmlBody,
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
