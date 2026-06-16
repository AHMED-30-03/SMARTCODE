import { NextRequest, NextResponse } from "next/server";

const QOYOD_API_KEY = process.env.QOYOD_API_KEY;
const QOYOD_BASE = "https://api.qoyod.com/api/2.0";
const COMPANY_ID = "27727";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { invoice_number, issue_date, customer_name, items, total_excl, total_tax, total_incl } = body;

  if (!QOYOD_API_KEY) {
    return NextResponse.json({ error: "QOYOD_API_KEY not set" }, { status: 500 });
  }

  // Build Qoyod invoice payload
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

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({ success: true, qoyod_id: data.quotation?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
