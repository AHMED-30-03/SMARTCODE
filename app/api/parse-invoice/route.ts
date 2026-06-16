import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { base64, mediaType } = await req.json();

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: mediaType || "application/pdf", data: base64 } },
            { type: "text", text: 'استخرج بيانات الفاتورة. أجب فقط بـ JSON بدون backticks أو أي نص إضافي:\n{"invoiceNumber":"","issueDate":"YYYY-MM-DD","supplier":"","supplierTax":"","customer":"","customerTax":"","items":[{"name":"","quantity":1,"price":0,"total":0,"tax":0}],"totalExcl":0,"totalTax":0,"totalIncl":0}' }
          ]
        }]
      })
    });

    const data = await response.json();

    // تحقق من إن الـ API ردت بـ error
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "Anthropic API error" }, { status: 500 });
    }

    const text = data.content?.map((c: any) => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();

    // تحقق إن الـ text مش فاضي
    if (!clean) {
      return NextResponse.json({ error: "Empty response from API" }, { status: 500 });
    }

    const parsed = JSON.parse(clean);
    return NextResponse.json({ success: true, data: parsed });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
