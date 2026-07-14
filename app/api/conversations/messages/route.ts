import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { conversationHandoffColumnsExist, getHandoffState } from "@/lib/conversation-handoff";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, "convMessages", LIMITS.convMessages);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(rl.retryAfter) } }
    );
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId")?.trim() ?? "";
  const chatbotId = req.nextUrl.searchParams.get("chatbotId")?.trim() ?? "";
  const since = req.nextUrl.searchParams.get("since")?.trim() ?? "";
  if (!conversationId || !chatbotId) {
    return NextResponse.json(
      { error: "conversationId and chatbotId are required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const auth = await getAuthFromCookie();
  const conn = await getDbConnection();
  try {
    const [convCheck] = await conn.execute(
      `SELECT c.id, b.user_id AS ownerId
       FROM conversations c
       INNER JOIN chatbots b ON b.id = c.chatbot_id
       WHERE c.id = ? AND b.id = ?`,
      [conversationId, chatbotId]
    );
    const rowsCheck = convCheck as { id: string; ownerId: string }[];
    if (rowsCheck.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    }

    const ownerId = rowsCheck[0].ownerId;
    if (auth?.userId && auth.userId !== ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const hasHandoff = await conversationHandoffColumnsExist(conn);
    let handoffMode: "ai" | "human" = "ai";
    if (hasHandoff) {
      const state = await getHandoffState(conn, conversationId);
      handoffMode = state.handoffMode;
    }

    let sql = `SELECT cm.id, cm.role, cm.content, cm.created_at AS createdAt
       FROM chat_messages cm
       WHERE cm.conversation_id = ?`;
    const params: (string | number)[] = [conversationId];
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(d.getTime())) {
        sql += " AND cm.created_at > ?";
        params.push(d.toISOString().slice(0, 19).replace("T", " "));
      }
    }
    sql += " ORDER BY cm.created_at ASC";

    const [rows] = await conn.execute(sql, params);
    const list = (rows as { id: string; role: string; content: string; createdAt: string }[]).map((r) => {
      const role =
        r.role === "user" || r.role === "assistant" || r.role === "agent" ? r.role : "assistant";
      return {
        id: r.id,
        role,
        content: typeof r.content === "string" ? r.content : "",
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ messages: list, handoffMode }, { headers: corsHeaders });
  } finally {
    await conn.end();
  }
}
