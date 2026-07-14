/**
 * Send support reply to the customer's email (so they get it in Gmail and see it in chat).
 */
export async function sendReplyToCustomerEmail(
  customerEmail: string,
  replyText: string,
  customerName?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const to = customerEmail.trim();
  if (!to) return { ok: false, error: "No customer email" };

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const subject = "Re: Your support request – our team replied";
  const body = [
    customerName ? `Hi ${customerName},` : "Hi,",
    "",
    "Our team has replied to your request:",
    "",
    "---",
    replyText.trim(),
    "---",
    "",
    "You can also see this reply in the chat on our website.",
  ].join("\n");

  try {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 60_000);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: body,
      }),
      signal: abort.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Send reply to customer] Resend failed:", res.status, err);
      return { ok: false, error: "Failed to send email" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[Send reply to customer] Error:", e);
    return { ok: false, error: "Failed to send email" };
  }
}
