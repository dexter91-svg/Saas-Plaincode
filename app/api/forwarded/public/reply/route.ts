import { NextRequest, NextResponse } from "next/server";
import { verifyForwardToken } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { sendReplyToCustomerEmail } from "@/lib/send-reply-to-customer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const conversationId = typeof body.id === "string" ? body.id.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const replyText = typeof body.replyText === "string" ? body.replyText.trim() : "";
    const agentEmail = typeof body.email === "string" ? body.email.trim() : "";

    if (!conversationId || !token || !replyText || !agentEmail) {
      return NextResponse.json({ error: "Missing required fields (id, token, replyText, email)" }, { status: 400 });
    }

    // Verify token
    const payload = verifyForwardToken(token);
    if (!payload || payload.conversationId !== conversationId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const conn = await getDbConnection();

    // Check forwarded conversation and get the owner's user_id
    const [fwdRows] = await conn.execute(
      "SELECT id, user_id AS userId, customer_email AS customerEmail, customer FROM forwarded_conversations WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
      [conversationId]
    );
    const list = fwdRows as { id: string; userId: string; customerEmail: string | null; customer: string | null }[];
    if (list.length === 0) {
      await conn.end();
      return NextResponse.json({ error: "Forwarded conversation not found" }, { status: 404 });
    }

    const fwdId = list[0].id;
    const userId = list[0].userId;
    const customerEmail = list[0].customerEmail;
    const customerName = list[0].customer;

    // Check if agentEmail matches user's email or forward_email
    const [userRows] = await conn.execute(
      "SELECT email, forward_email AS forwardEmail FROM users WHERE id = ?",
      [userId]
    );
    const user = (userRows as { email: string; forwardEmail: string | null }[])[0];
    if (!user) {
      await conn.end();
      return NextResponse.json({ error: "Store owner not found" }, { status: 404 });
    }

    const emailAllowed = 
      agentEmail.toLowerCase() === user.email.toLowerCase() || 
      (user.forwardEmail && agentEmail.toLowerCase() === user.forwardEmail.toLowerCase());

    if (!emailAllowed) {
      await conn.end();
      return NextResponse.json({ error: "Unauthorized email address. You do not have permission to reply." }, { status: 403 });
    }

    // Update forwarded conversation
    await conn.execute(
      "UPDATE forwarded_conversations SET reply_text = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ?",
      [replyText, fwdId]
    );

    // Resolve ticket
    await conn.execute(
      "UPDATE tickets SET status = 'resolved', outcome = 'Replied by support' WHERE conversation_id = ?",
      [conversationId]
    );

    await conn.end();

    // Send email to customer
    if (customerEmail) {
      await sendReplyToCustomerEmail(customerEmail, replyText, customerName);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/forwarded/public/reply error:", err);
    return NextResponse.json({ error: "Failed to submit reply" }, { status: 500 });
  }
}
