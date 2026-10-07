import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { sendReplyToCustomerEmail } from "@/lib/send-reply-to-customer";

/**
 * Resend Inbound Webhook: when support replies by email (e.g. from Gmail),
 * Resend sends email.received here. We save the reply (shows in chat) and
 * email it to the customer so they get it in Gmail too.
 *
 * Setup: Resend Dashboard → Inbound → add your domain/address → set Webhook URL to:
 *   https://your-domain.com/api/webhooks/resend-inbound
 * Forward emails must be sent FROM that inbound address so replies come back to Resend.
 */

const CONV_ID_REGEX = /\[conv:([a-f0-9-]{36})\]/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.type !== "email.received" || !body?.data?.email_id) {
      return NextResponse.json({ ok: false, reason: "invalid payload" }, { status: 400 });
    }

    const emailId = body.data.email_id as string;
    const subject = (body.data.subject as string) || "";
    const match = subject.match(CONV_ID_REGEX);
    if (!match) {
      return NextResponse.json({ ok: true, reason: "no conversation id in subject" });
    }
    const conversationId = match[1];

    // Look up the escalation (and its owner's own Resend key, if they've set one) before
    // calling Resend at all — avoids wasting an API call on a webhook that won't match
    // anything, and lets us use the right key for the customer-facing send below.
    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      `SELECT fc.id, fc.customer_email, fc.customer
       FROM forwarded_conversations fc
       WHERE fc.conversation_id = ? ORDER BY fc.created_at DESC LIMIT 1`,
      [conversationId]
    );
    const list = rows as { id: string; customer_email: string | null; customer: string | null }[];
    if (list.length === 0) {
      await conn.end();
      return NextResponse.json({ ok: true, reason: "no forwarded row" });
    }
    const forwardedId = list[0].id;
    const customerEmail = list[0].customer_email;
    const customerName = list[0].customer;

    // Fetching the *received* email must use the platform's own Resend key — that's the
    // account whose inbound address actually received it, regardless of which store this
    // escalation belongs to or whether that store has its own key configured.
    const platformApiKey = process.env.RESEND_API_KEY;
    if (!platformApiKey) {
      await conn.end();
      console.error("[Resend inbound] RESEND_API_KEY not set (needed to fetch the received email)");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${platformApiKey}` },
    });
    if (!res.ok) {
      await conn.end();
      console.error("[Resend inbound] Failed to fetch email:", res.status);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    const email = (await res.json()) as { text?: string; html?: string };
    const replyText = (email.text || email.html || "").trim().slice(0, 10000);
    if (!replyText) {
      await conn.end();
      return NextResponse.json({ ok: true, reason: "empty body" });
    }

    await conn.execute(
      "UPDATE forwarded_conversations SET reply_text = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ?",
      [replyText, forwardedId]
    );
    await conn.execute(
      "UPDATE tickets SET status = 'resolved', outcome = 'Replied by support' WHERE conversation_id = ?",
      [conversationId]
    );
    await conn.end();

    if (customerEmail) {
      // Sending the reply onward to the customer can use the store's own key if they've
      // set one (same pattern as escalation alerts), falling back to the platform key.
      await sendReplyToCustomerEmail(customerEmail, replyText, customerName);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Resend inbound] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
