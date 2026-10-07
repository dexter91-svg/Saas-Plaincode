import { randomUUID } from "crypto";
import type { PoolConnection } from "mysql2/promise";
import { createForwardToken } from "./auth";
import { postToResend } from "./resend-request";


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
  resendApiKey?: string | null;
  priority?: "normal" | "high";
}): Promise<boolean> {
  const token = createForwardToken(args.conversationId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${baseUrl}/forwarded-conversations?id=${args.conversationId}&token=${token}`;

  const apiKey = args.resendApiKey?.trim() || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Forward to email] RESEND_API_KEY missing — email not sent.");
    return false;
  }
  const msgText = args.customerMessage?.trim() || null;
  const previewText = args.preview?.replace(/\s+/g, " ").trim() || null;
  const showPreview = previewText && previewText !== msgText;
  const isHigh = args.priority === "high";
  const cleanOrder = args.orderRef?.trim() ? args.orderRef.trim().replace(/^#/, "") : null;
  const priorityTag = isHigh ? "[High Priority] " : "";

  // Helpdesk-compatible consistent subject line:
  // e.g. "[Plainbot Escalation] Order #12345 — Sarah T."
  let subject: string;
  if (cleanOrder) {
    subject = `[Plainbot Escalation] ${priorityTag}Order #${cleanOrder} — ${args.customer}`.replace(/\s+/g, " ");
  } else if (args.ticketRef) {
    subject = `[Plainbot Escalation] ${priorityTag}Ticket #${args.ticketRef.replace(/^#/, "")} — ${args.customer}`.replace(/\s+/g, " ");
  } else {
    subject = `[Plainbot Escalation] ${priorityTag}${args.customer}`.replace(/\s+/g, " ");
  }

  // Structured helpdesk ticket body with clear metadata fields and transcript
  const emailBody = [
    "==================================================",
    isHigh ? "[PLAINBOT ESCALATION - HIGH PRIORITY]" : "[PLAINBOT ESCALATION]",
    "==================================================",
    `Customer: ${args.customer} <${args.customerEmail}>`,
    cleanOrder ? `Order: #${cleanOrder}` : "Order: Not provided",
    args.ticketRef ? `Ticket Ref: #${args.ticketRef}` : "",
    `Priority: ${isHigh ? "High (Refund / Attention Required)" : "Normal"}`,
    `Dashboard Link: ${link}`,
    "",
    msgText ? `Customer Note:\n${msgText}\n` : "",
    showPreview ? `Preview:\n${previewText}\n` : "",
    "==================================================",
    "CONVERSATION TRANSCRIPT",
    "==================================================",
    args.conversationText || "No prior conversation messages.",
    "==================================================",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await postToResend("/emails", apiKey, {
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: [args.to],
      // Once a real inbound address exists (SUPPORT_INBOUND_EMAIL, on a verified
      // domain with Resend Inbound configured), merchant replies route through our
      // webhook and sync back into the conversation. Until then, fall back to the
      // customer's address so replies still work, just without syncing to the app.
      reply_to: process.env.SUPPORT_INBOUND_EMAIL || args.customerEmail,
      subject,
      text: emailBody,
    });
    if (!res.ok) {
      console.error("Resend send failed:", res.status, res.json);
      return false;
    }
    return true;
  } catch (e) {
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


  let existingRow: { id: string; customerEmail: string | null; ticketRef: string | null; priority?: string | null } | null = null;
  try {
    const [existing] = await conn.execute(
      `SELECT id, customer_email AS customerEmail, ticket_ref AS ticketRef, priority
       FROM forwarded_conversations
       WHERE conversation_id = ? AND user_id = ?
       LIMIT 1`,
      [input.conversationId, input.userId]
    );
    existingRow = Array.isArray(existing) && existing.length > 0
      ? (existing[0] as { id: string; customerEmail: string | null; ticketRef: string | null; priority?: string | null })
      : null;
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "ER_BAD_FIELD_ERROR") {
      const [existing] = await conn.execute(
        `SELECT id, customer_email AS customerEmail, ticket_ref AS ticketRef
         FROM forwarded_conversations
         WHERE conversation_id = ? AND user_id = ?
         LIMIT 1`,
        [input.conversationId, input.userId]
      );
      existingRow = Array.isArray(existing) && existing.length > 0
        ? (existing[0] as { id: string; customerEmail: string | null; ticketRef: string | null; priority?: string | null })
        : null;
    } else throw err;
  }

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

  const orderRef = input.orderRef?.trim() || null;
  const customerMessage = input.customerMessage?.trim() || null;
  const fwdId = existingRow?.id ?? randomUUID();
  if (existingRow) {
    await conn.execute(
      `UPDATE forwarded_conversations
       SET customer = ?, customer_email = ?, preview = ?, ticket_ref = COALESCE(ticket_ref, ?), order_ref = COALESCE(order_ref, ?), customer_message = COALESCE(customer_message, ?)
       WHERE id = ?`,
      [input.customer, customerEmail, preview, ticketRef, orderRef, customerMessage, fwdId]
    );
  } else {
    await conn.execute(
      `INSERT INTO forwarded_conversations (id, user_id, conversation_id, customer, customer_email, preview, forwarded_as, ticket_ref, order_ref, customer_message)
       VALUES (?, ?, ?, ?, ?, ?, 'email', ?, ?, ?)`,
      [fwdId, input.userId, input.conversationId, input.customer, customerEmail, preview, ticketRef, orderRef, customerMessage]
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
  const userRow = (userRows as { forward_email?: string }[])[0];
  const forwardEmail = userRow?.forward_email ?? null;

  let emailSent = false;
  if (forwardEmail) {
    const isHigh = existingRow?.priority === "high";
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
      priority: isHigh ? "high" : "normal",
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
    priority?: "normal" | "high";
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
    if (args.priority === "high") {
      await conn.execute(
        "UPDATE forwarded_conversations SET priority = 'high' WHERE id = ?",
        [existing.id]
      ).catch(() => {});
    }
    return {
      ticketRef: existing.ticketRef || "",
      forwardId: existing.id,
    };
  }

  const priority = args.priority || "normal";
  const ticketId = randomUUID();
  const ticketRefVal = "TK-" + ticketId.slice(0, 8).toUpperCase();
  await conn.execute(
    `INSERT INTO tickets (id, user_id, conversation_id, ticket_ref, type, customer, query_preview, status)
     VALUES (?, ?, ?, ?, 'forwarded_email', ?, ?, 'open')`,
    [ticketId, args.userId, args.conversationId, ticketRefVal, args.customer, args.preview]
  );
  const forwardId = randomUUID();
  await conn.execute(
    `INSERT INTO forwarded_conversations (id, user_id, conversation_id, customer, customer_email, preview, forwarded_as, ticket_ref, priority)
     VALUES (?, ?, ?, ?, NULL, ?, 'email', ?, ?)`,
    [forwardId, args.userId, args.conversationId, args.customer, args.preview, ticketRefVal, priority]
  );
  await conn.execute("UPDATE conversations SET status = 'forwarded' WHERE id = ?", [args.conversationId]);
  return { ticketRef: ticketRefVal, forwardId };
}
