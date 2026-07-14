import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";
import { sendReplyToCustomerEmail } from "@/lib/send-reply-to-customer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = await req.json();
    const replyText = typeof body.replyText === "string" ? body.replyText.trim() : "";

    if (!replyText) {
      return NextResponse.json(
        { error: "replyText is required" },
        { status: 400 }
      );
    }

    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      "SELECT id, conversation_id AS conversationId, customer_email, customer FROM forwarded_conversations WHERE id = ? AND user_id = ?",
      [id, auth.userId]
    );
    const list = rows as { id: string; conversationId: string; customer_email: string | null; customer: string | null }[];
    if (list.length === 0) {
      await conn.end();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await conn.execute(
      "UPDATE forwarded_conversations SET reply_text = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [replyText, id, auth.userId]
    );
    const customerEmail = list[0].customer_email;
    const customerName = list[0].customer;
    const conversationId = list[0].conversationId;
    await conn.execute(
      "UPDATE tickets SET status = 'resolved', outcome = 'Replied by support' WHERE conversation_id = ?",
      [conversationId]
    );
    await conn.end();

    if (customerEmail) {
      await sendReplyToCustomerEmail(customerEmail, replyText, customerName);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forwarded reply error:", err);
    return NextResponse.json({ error: "Failed to save reply" }, { status: 500 });
  }
}
