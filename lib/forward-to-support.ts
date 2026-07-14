import { randomUUID } from "crypto";
import type { PoolConnection } from "mysql2/promise";
import { createForwardToken } from "./auth";


export type ForwardSubmitInput = {
  userId: string;
  conversationId: string;
  customer: string;
  customerEmail: string;
  orderRef?: string | null;
  customerMessage?: string | null;
  preview?: string;
  conversationText?: string;
};

export type ForwardSubmitResult = {
  id: string;
  ticketRef: string | null;
  emailSent: boolean;
  alreadySubmitted: boolean;
};

async function sendForwardEmail(args: {
  to: string;
  conversationId: string;
  ticketRef: string | null;
  customer: string;
  customerEmail: string;
  orderRef?: string | null;
  customerMessage?: string | null;
  preview: string;
  conversationText: string;
}): Promise<boolean> {
  const token = createForwardToken(args.conversationId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${baseUrl}/forwarded-conversations?id=${args.conversationId}&token=${token}`;


  if (!process.env.RESEND_API_KEY) {
    console.log("[Forward to email] RESEND_API_KEY missing — email not sent.");
    return false;
  }
  const emailBody = [
    "Forwarded conversation (customer submitted contact form)",
    args.ticketRef ? `Ticket: #${args.ticketRef}` : "",
    `Customer: ${args.customer}`,
    `Email: ${args.customerEmail}`,
    args.orderRef ? `Order/Ref: ${args.orderRef}` : "",
    args.customerMessage ? `Message: ${args.customerMessage}` : "",
    "",
    `Preview: ${args.preview}`,
    "",
    `View & Reply (Read-Only): ${link}`,
    "",
    args.conversationText ? `Full conversation:\n${args.conversationText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const subject = args.ticketRef
    ? `Forwarded Ticket #${args.ticketRef} [conv:${args.conversationId}] ${args.preview.slice(0, 40)}${
        args.preview.length > 40 ? "…" : ""
      }`
    : `Forwarded [conv:${args.conversationId}] ${args.preview.slice(0, 50)}${args.preview.length > 50 ? "…" : ""}`;

  const resendAbort = new AbortController();
  const resendTimeout = setTimeout(() => resendAbort.abort(), 60_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: args.to,
        subject,
        text: emailBody,
      }),
      signal: resendAbort.signal,
    });
    clearTimeout(resendTimeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Resend send failed:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    clearTimeout(resendTimeout);
    console.error("Resend send failed:", e);
    return false;
  }
}

/** Submit or complete a forward: saves customer details, emails the store owner, marks conversation forwarded. */
export async function submitForwardToSupport(
  conn: PoolConnection,
  input: ForwardSubmitInput
): Promise<ForwardSubmitResult> {
  const customerEmail = input.customerEmail.trim();
  if (!customerEmail) {
    throw new Error("customerEmail is required");
  }

  const token = createForwardToken(input.conversationId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${baseUrl}/forwarded-conversations?id=${input.conversationId}&token=${token}`;
  console.log(`\n--- [FORWARD LINK FOR DEVELOPMENT (submitForwardToSupport)] ---\n${link}\n---------------------------------------\n`);


  const [existing] = await conn.execute(
    `SELECT id, customer_email AS customerEmail, ticket_ref AS ticketRef
     FROM forwarded_conversations
     WHERE conversation_id = ? AND user_id = ?
     LIMIT 1`,
    [input.conversationId, input.userId]
  );
  const existingRow = Array.isArray(existing) && existing.length > 0
    ? (existing[0] as { id: string; customerEmail: string | null; ticketRef: string | null })
    : null;

  if (existingRow?.customerEmail?.trim()) {
    const token = createForwardToken(input.conversationId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${baseUrl}/forwarded-conversations?id=${input.conversationId}&token=${token}`;
    console.log(`\n--- [FORWARD LINK FOR DEVELOPMENT (ALREADY SUBMITTED)] ---\n${link}\n---------------------------------------\n`);
    return {
      id: existingRow.id,
      ticketRef: existingRow.ticketRef,
      emailSent: false,
      alreadySubmitted: true,
    };
  }

  let ticketRef: string | null = existingRow?.ticketRef ?? null;
  if (!ticketRef) {
    try {
      const [ticketRows] = await conn.execute(
        "SELECT ticket_ref FROM tickets WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
        [input.conversationId]
      );
      const tr = (ticketRows as { ticket_ref: string }[])[0];
      if (tr?.ticket_ref) ticketRef = tr.ticket_ref;
    } catch {
      /* ignore */
    }
  }

  if (!ticketRef) {
    const ticketId = randomUUID();
    ticketRef = "TK-" + ticketId.slice(0, 8).toUpperCase();
    const preview =
      input.preview?.trim() ||
      (input.customerMessage?.trim() ? input.customerMessage.trim().slice(0, 500) : "Conversation");
    await conn.execute(
      `INSERT INTO tickets (id, user_id, conversation_id, ticket_ref, type, customer, query_preview, status)
       VALUES (?, ?, ?, ?, 'forwarded_email', ?, ?, 'open')`,
      [ticketId, input.userId, input.conversationId, ticketRef, input.customer, preview]
    );
  }

  const preview =
    input.preview?.trim() ||
    (input.customerMessage?.trim() ? input.customerMessage.trim().slice(0, 500) : "Conversation");

  const fwdId = existingRow?.id ?? randomUUID();
  if (existingRow) {
    await conn.execute(
      `UPDATE forwarded_conversations
       SET customer = ?, customer_email = ?, preview = ?, ticket_ref = COALESCE(ticket_ref, ?)
       WHERE id = ?`,
      [input.customer, customerEmail, preview, ticketRef, fwdId]
    );
  } else {
    await conn.execute(
      `INSERT INTO forwarded_conversations (id, user_id, conversation_id, customer, customer_email, preview, forwarded_as, ticket_ref)
       VALUES (?, ?, ?, ?, ?, ?, 'email', ?)`,
      [fwdId, input.userId, input.conversationId, input.customer, customerEmail, preview, ticketRef]
    );
  }

  let conversationText = input.conversationText?.trim() || "";
  if (!conversationText) {
    const [msgRows] = await conn.execute(
      "SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [input.conversationId]
    );
    const msgs = (msgRows as { role: string; content: string }[]) || [];
    conversationText = msgs
      .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
      .join("\n");
  }

  const [userRows] = await conn.execute("SELECT forward_email FROM users WHERE id = ?", [input.userId]);
  const forwardEmail = (userRows as { forward_email?: string }[])[0]?.forward_email ?? null;

  let emailSent = false;
  if (forwardEmail) {
    emailSent = await sendForwardEmail({
      to: forwardEmail,
      conversationId: input.conversationId,
      ticketRef,
      customer: input.customer,
      customerEmail,
      orderRef: input.orderRef,
      customerMessage: input.customerMessage,
      preview,
      conversationText,
    });
  }

  await conn.execute("UPDATE conversations SET status = 'forwarded' WHERE id = ?", [input.conversationId]);

  return { id: fwdId, ticketRef, emailSent, alreadySubmitted: false };
}

/** Create a pending forward (ticket + row) when AI escalates — email sent after form submit. */
export async function createPendingForwardFromChat(
  conn: PoolConnection,
  args: {
    userId: string;
    conversationId: string;
    customer: string;
    preview: string;
  }
): Promise<{ ticketRef: string; forwardId: string }> {
  const [existingFwd] = await conn.execute(
    "SELECT id, ticket_ref AS ticketRef FROM forwarded_conversations WHERE conversation_id = ? LIMIT 1",
    [args.conversationId]
  );
  const existing = Array.isArray(existingFwd) && existingFwd.length > 0
    ? (existingFwd[0] as { id: string; ticketRef: string | null })
    : null;
  if (existing) {
    return {
      ticketRef: existing.ticketRef || "",
      forwardId: existing.id,
    };
  }

  const ticketId = randomUUID();
  const ticketRefVal = "TK-" + ticketId.slice(0, 8).toUpperCase();
  await conn.execute(
    `INSERT INTO tickets (id, user_id, conversation_id, ticket_ref, type, customer, query_preview, status)
     VALUES (?, ?, ?, ?, 'forwarded_email', ?, ?, 'open')`,
    [ticketId, args.userId, args.conversationId, ticketRefVal, args.customer, args.preview]
  );
  const forwardId = randomUUID();
  await conn.execute(
    `INSERT INTO forwarded_conversations (id, user_id, conversation_id, customer, customer_email, preview, forwarded_as, ticket_ref)
     VALUES (?, ?, ?, ?, NULL, ?, 'email', ?)`,
    [forwardId, args.userId, args.conversationId, args.customer, args.preview, ticketRefVal]
  );
  await conn.execute("UPDATE conversations SET status = 'forwarded' WHERE id = ?", [args.conversationId]);
  return { ticketRef: ticketRefVal, forwardId };
}
