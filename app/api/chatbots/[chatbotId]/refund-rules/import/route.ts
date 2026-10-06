import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "missing-key" });

type Params = { params: Promise<{ chatbotId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { chatbotId } = await params;
    if (!chatbotId) return NextResponse.json({ error: "Missing chatbot id" }, { status: 400 });

    const conn = await getDbConnection();
    const [rows] = await conn.execute("SELECT id FROM chatbots WHERE id = ? AND user_id = ?", [chatbotId, auth.userId]);
    await conn.end();
    if ((rows as { id: string }[]).length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const policyText = typeof body.policyText === "string" ? body.policyText.trim() : "";
    if (!policyText) return NextResponse.json({ error: "policyText is required" }, { status: 400 });
    if (policyText.length > 8000) return NextResponse.json({ error: "Text too long (max 8000 chars)" }, { status: 400 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract refund/return policy details from the text. Return ONLY valid JSON:
{
  "refundMaxAmount": number or null,
  "refundWindowDays": number or null,
  "summary": string
}
- refundMaxAmount: the maximum dollar/currency amount eligible for an automatic refund. null means no limit.
- refundWindowDays: how many days from purchase the customer has to request a return/refund. null if not mentioned.
- summary: one short sentence summarising what you found (e.g. "Refunds up to $50 within 30 days").`,
        },
        { role: "user", content: policyText },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: { refundMaxAmount?: number | null; refundWindowDays?: number | null; summary?: string } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    return NextResponse.json({
      refundMaxAmount: typeof parsed.refundMaxAmount === "number" && parsed.refundMaxAmount > 0 ? parsed.refundMaxAmount : null,
      refundWindowDays: typeof parsed.refundWindowDays === "number" && parsed.refundWindowDays > 0 ? Math.round(parsed.refundWindowDays) : null,
      summary: typeof parsed.summary === "string" ? parsed.summary : "No refund rules found.",
    });
  } catch (err) {
    console.error("POST refund-rules/import:", err);
    return NextResponse.json({ error: "Failed to parse policy" }, { status: 500 });
  }
}
