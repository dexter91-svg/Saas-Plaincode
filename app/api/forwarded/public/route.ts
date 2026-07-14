import { NextRequest, NextResponse } from "next/server";
import { verifyForwardToken } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";

  if (!conversationId || !token) {
    return NextResponse.json({ error: "Missing conversation ID or token" }, { status: 400 });
  }

  const payload = verifyForwardToken(token);
  if (!payload || payload.conversationId !== conversationId) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    const conn = await getDbConnection();

    // Fetch forwarded conversation metadata
    const [fwdRows] = await conn.execute(
      `SELECT id, customer, customer_email AS customerEmail, ticket_ref AS ticketRef, replied_at AS repliedAt, reply_text AS replyText, created_at AS createdAt 
       FROM forwarded_conversations WHERE conversation_id = ?`,
      [conversationId]
    );
    const fwd = (fwdRows as any[])[0];
    if (!fwd) {
      await conn.end();
      return NextResponse.json({ error: "Forwarded conversation not found" }, { status: 404 });
    }

    // Fetch all messages for the thread
    const [msgRows] = await conn.execute(
      `SELECT id, role, content, created_at AS createdAt
       FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
      [conversationId]
    );
    const messages = (msgRows as any[]).map((r) => ({
      id: r.id,
      role: r.role === "user" || r.role === "assistant" || r.role === "agent" ? r.role : "assistant",
      content: typeof r.content === "string" ? r.content : "",
      createdAt: r.createdAt,
    }));

    await conn.end();

    return NextResponse.json({
      conversation: {
        id: fwd.id,
        conversationId,
        customer: fwd.customer || "Customer",
        customerEmail: fwd.customerEmail,
        ticketRef: fwd.ticketRef,
        repliedAt: fwd.repliedAt,
        replyText: fwd.replyText,
        createdAt: fwd.createdAt,
      },
      messages,
    });
  } catch (err) {
    console.error("GET /api/forwarded/public error:", err);
    return NextResponse.json({ error: "Failed to retrieve conversation" }, { status: 500 });
  }
}
