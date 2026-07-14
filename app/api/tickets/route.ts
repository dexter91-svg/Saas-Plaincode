import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatbotId = req.nextUrl.searchParams.get("chatbotId")?.trim() || null;

  try {
    const conn = await getDbConnection();
    let rows: unknown[];
    if (chatbotId) {
      const [raw] = await conn.execute(
        `SELECT t.id, t.ticket_ref AS ticketRef, t.type, t.status, t.outcome, t.customer, t.query_preview AS queryPreview, t.created_at AS createdAt
         FROM tickets t
         INNER JOIN conversations c ON c.id = t.conversation_id
         WHERE t.user_id = ? AND c.chatbot_id = ?
         ORDER BY t.created_at DESC
         LIMIT 200`,
        [auth.userId, chatbotId]
      );
      rows = Array.isArray(raw) ? raw : [];
    } else {
      const [raw] = await conn.execute(
        `SELECT id, ticket_ref AS ticketRef, type, status, outcome, customer, query_preview AS queryPreview, created_at AS createdAt
         FROM tickets WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 200`,
        [auth.userId]
      );
      rows = Array.isArray(raw) ? raw : [];
    }
    await conn.end();

    const list = (rows as {
      id: string;
      ticketRef: string;
      type: string;
      status: string;
      outcome: string | null;
      customer: string | null;
      queryPreview: string | null;
      createdAt: Date;
    }[]).map((r) => ({
      id: r.id,
      ticketRef: r.ticketRef,
      type: r.type,
      status: r.status,
      outcome: r.outcome,
      customer: r.customer || "Customer",
      queryPreview: r.queryPreview || "",
      createdAt: new Date(r.createdAt).getTime(),
    }));

    return NextResponse.json({ tickets: list });
  } catch (err) {
    console.error("GET /api/tickets:", err);
    return NextResponse.json({ error: "Failed to load tickets." }, { status: 500 });
  }
}
