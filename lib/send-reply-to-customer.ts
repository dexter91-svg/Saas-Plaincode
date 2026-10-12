/**
 * Send support reply to the customer's email (so they get it in Gmail and see it in chat).
 */
import { postToResend } from "@/lib/resend-request";

export async function sendReplyToCustomerEmail(
  customerEmail: string,
  replyText: string,
  customerName?: string | null,
  resendApiKey?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = resendApiKey?.trim() || process.env.RESEND_API_KEY;
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
    const res = await postToResend("/emails", apiKey, { from, to: [to], subject, text: body });
    if (!res.ok) {
      console.error("[Send reply to customer] Resend failed:", res.status, res.json);
      return { ok: false, error: "Failed to send email" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[Send reply to customer] Error:", e);
    return { ok: false, error: "Failed to send email" };
  }
}
