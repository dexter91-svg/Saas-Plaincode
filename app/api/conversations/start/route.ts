import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDbConnection } from "@/lib/db";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** Starts an empty conversation so the support form can be sent before any chat message. */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "conversation-start", LIMITS.chat);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(rl.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const chatbotId = typeof body.chatbotId === "string" ? body.chatbotId.trim() : "";
  if (!chatbotId) {
    return NextResponse.json({ error: "chatbotId is required" }, { status: 400, headers: corsHeaders });
  }

  const conn = await getDbConnection();
  try {
    const [bots] = await conn.execute("SELECT id FROM chatbots WHERE id = ? AND is_active = 1", [chatbotId]);
    if ((bots as { id: string }[]).length === 0) {
      return NextResponse.json({ error: "Chatbot not found or inactive." }, { status: 404, headers: corsHeaders });
    }
    const conversationId = randomUUID();
    await conn.execute("INSERT INTO conversations (id, chatbot_id, status) VALUES (?, ?, 'open')", [
      conversationId,
      chatbotId,
    ]);
    return NextResponse.json({ conversationId }, { headers: corsHeaders });
  } finally {
    await conn.end();
  }
}
