import { NextRequest, NextResponse } from "next/server";

const QOYOD_BASE = "https://api.qoyod.com/api/2.0";
const COMPANY_ID = "27727";

export async function POST(req: NextRequest) {
  const QOYOD_API_KEY = process.env.QOYOD_API_KEY;
  const body = await req.json();
  const { invoice_number, issue_date, customer_name, items } = body;

  if (!QOYOD_API_KEY) {
    return NextResponse.json({ error: "QOYOD_API_KEY not set" }, { status: 500 });
  }

  const payload = {
    quotation: {
      reference: invoice_number,
      issue_date: issue_date,
      due_date: issue_date,
      customer_name: customer_name,
      description: `عرض سعر ${invoice_number}`,
      line_items: items.map((item: any) => ({
        product_name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.price || item.total,
        vat_rate: 15,
      })),
    }
  };

  try {
    const res = await fetch(`${QOYOD_BASE}/quotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-KEY": QOYOD_API_KEY,
        "organization-id": COMPANY_ID,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("Qoyod response status:", res.status);
    console.log("Qoyod response body:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Qoyod returned non-JSON", raw: text.slice(0, 500) }, { status: 500 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({ success: true, qoyod_id: data.quotation?.id });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
