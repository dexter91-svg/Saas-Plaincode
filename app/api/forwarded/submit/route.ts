import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { submitForwardToSupport } from "@/lib/forward-to-support";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** Public: customer submits the support form from chat widget or embed. */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "forward-submit", LIMITS.chat);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const chatbotId = typeof body.chatbotId === "string" ? body.chatbotId.trim() : "";
    const customer = typeof body.customer === "string" ? body.customer.trim() || "Customer" : "Customer";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const orderRef = typeof body.orderRef === "string" ? body.orderRef.trim() : null;
    const customerMessage = typeof body.customerMessage === "string" ? body.customerMessage.trim() : null;
    const preview = typeof body.preview === "string" ? body.preview.trim() : "";
    const conversationText = typeof body.conversationText === "string" ? body.conversationText.trim() : "";

    if (!conversationId || !chatbotId) {
      return NextResponse.json(
        { error: "conversationId and chatbotId are required" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!customerEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400, headers: corsHeaders });
    }

    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      `SELECT c.id AS conversationId, b.user_id AS userId
       FROM conversations c
       INNER JOIN chatbots b ON b.id = c.chatbot_id
       WHERE c.id = ? AND c.chatbot_id = ? AND b.is_active = 1
       LIMIT 1`,
      [conversationId, chatbotId]
    );
    const row = (rows as { conversationId: string; userId: string }[])[0];
    if (!row) {
      await conn.end();
      return NextResponse.json({ error: "Conversation not found" }, { status: 404, headers: corsHeaders });
    }

    const result = await submitForwardToSupport(conn, {
      userId: row.userId,
      conversationId,
      customer,
      customerEmail,
      orderRef,
      customerMessage,
      preview: preview || customerMessage || "Support request",
      conversationText,
    });
    await conn.end();

    return NextResponse.json(
      {
        ok: true,
        id: result.id,
        ticketRef: result.ticketRef,
        emailSent: result.emailSent,
        alreadySubmitted: result.alreadySubmitted,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Forward submit error:", err);
    return NextResponse.json({ error: "Failed to forward" }, { status: 500, headers: corsHeaders });
  }
}
