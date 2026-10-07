import { postToResend } from "@/lib/resend-request";

export type AlertDetails = {
  customer: string;
  customerEmail: string | null;
  orderRef: string | null;
  preview: string;
  waitingMinutes: number;
};

const TRANSCRIPT_LIMIT = 30;

function roleName(role: string): string {
  if (role === "user") return "Customer";
  if (role === "agent") return "Agent";
  return "AI";
}

function formatWait(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return hours < 48 ? `${Math.round(hours)} h` : `${Math.round(hours / 24)} days`;
}

function dashboardUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/forwarded-conversations`;
}

async function sendViaResend(to: string, subject: string, text: string, resendApiKey?: string | null): Promise<{ ok: boolean; error?: string }> {
  const apiKey = resendApiKey?.trim() || process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set on the server." };

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  try {
    const res = await postToResend("/emails", apiKey, { from, to: [to], subject, text });
    if (!res.ok) {
      console.error("[Escalation alert] Resend failed:", res.status, res.json);
      return { ok: false, error: `Email provider returned ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[Escalation alert] Error:", e);
    return { ok: false, error: "Failed to send email" };
  }
}

/** Alert the store owner that an escalation has been sitting unacknowledged. */
export async function sendEscalationAlertEmail(
  to: string,
  details: AlertDetails,
  resendApiKey?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const subject = `Action needed: escalation from ${details.customer} is still unacknowledged`;
  const customerLine = `Customer: ${details.customer}${details.customerEmail ? ` <${details.customerEmail}>` : ""}`;
  const orderLine = details.orderRef ? `Order: ${details.orderRef}` : null;
  const message = details.preview.replace(/\s+/g, " ").trim().slice(0, 300);
  const text = [
    "An escalated conversation has been waiting without anyone acknowledging it.",
    "",
    customerLine,
    orderLine,
    `Waiting: ${formatWait(details.waitingMinutes)}`,
    "",
    `Message: ${message}`,
    "",
    `Open your escalations: ${dashboardUrl()}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  return sendViaResend(to, subject, text, resendApiKey);
}

/** Test email sent from the settings page so the owner can confirm delivery. */
export async function sendEscalationAlertTest(to: string, resendApiKey?: string | null): Promise<{ ok: boolean; error?: string }> {
  const text = [
    "This is a test of your escalation alerts.",
    "",
    "If you received this, alerts will reach this address when an escalation sits unacknowledged past your chosen time.",
    "",
    `Open your escalations: ${dashboardUrl()}`,
  ].join("\n");
  return sendViaResend(to, "[Test] Plainbot escalation alert", text, resendApiKey);
}
