/**
 * Emails when user hits conversation limit (free or pro) and 24h follow-up reminders.
 * Uses: RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL.
 */

import { postToResend } from "@/lib/resend-request";

function getFrom(): string {
  return process.env.EMAIL_FROM || "hello@plainbot.io";
}

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (url) return url.startsWith("http") ? url : `https://${url}`;
  return "https://plainbot.io";
}

export type PlanKind = "free" | "pro";

export async function sendLimitReachedEmail(
  to: string,
  plan: PlanKind,
  name?: string | null,
  resendApiKey?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = resendApiKey?.trim() || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Limit reached email] RESEND_API_KEY missing — not sent.");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const greeting = name ? `Hi ${name},` : "Hi,";
  const isPro = plan === "pro";
  const subject = isPro
    ? "Your Pro conversations are used up — renew to continue"
    : "Your free plan conversations are used up — upgrade to Pro";
  const body = isPro
    ? [
        greeting,
        "",
        "You've used all your plan conversations for this month.",
        "",
        "Renew your subscription to keep your chatbot live and reset your monthly limit.",
        "",
        `Log in and renew: ${getBaseUrl()}/login`,
        "",
        "If you have any questions, reply to this email or contact us at hello@plainbot.io.",
        "",
        "— The Plainbot team",
      ].join("\n")
    : [
        greeting,
        "",
        "You've used all 100 free conversations for this month.",
        "",
        "Upgrade to a paid plan for more conversations each month. See plainbot.io/pricing for Growth, Pro, and Agency.",
        "",
        `Upgrade here: ${getBaseUrl()}/pricing`,
        "",
        "Log in to your dashboard and choose Pro to make payment.",
        "",
        "— The Plainbot team",
      ].join("\n");

  try {
    const res = await postToResend("/emails", apiKey, { from: getFrom(), to: [to.trim()], subject, text: body });
    if (!res.ok) {
      console.error("[Limit reached email] Resend failed:", res.status, res.json);
      return { ok: false, error: "Failed to send" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[Limit reached email] Error:", e);
    return { ok: false, error: "Failed to send" };
  }
}

export async function sendUpgradeReminderEmail(
  to: string,
  plan: PlanKind,
  name?: string | null,
  resendApiKey?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = resendApiKey?.trim() || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Upgrade reminder] RESEND_API_KEY missing — not sent.");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const greeting = name ? `Hi ${name},` : "Hi,";
  const isPro = plan === "pro";
  const subject = isPro
    ? "Reminder: Renew your Plainbot Pro plan"
    : "Reminder: Upgrade to Plainbot Pro";
  const body = isPro
    ? [
        greeting,
        "",
        "This is a quick reminder that you've used all your Pro conversations this month.",
        "",
        "Renew to keep your chatbot live:",
        "",
        ` ${getBaseUrl()}/login`,
        "",
        "— The Plainbot team",
      ].join("\n")
    : [
        greeting,
        "",
        "This is a quick reminder: your free plan conversations are used up.",
        "",
        "Upgrade to a paid plan to keep your chatbot working:",
        "",
        ` ${getBaseUrl()}/pricing`,
        "",
        "— The Plainbot team",
      ].join("\n");

  try {
    const res = await postToResend("/emails", apiKey, { from: getFrom(), to: [to.trim()], subject, text: body });
    if (!res.ok) {
      console.error("[Upgrade reminder] Resend failed:", res.status, res.json);
      return { ok: false, error: "Failed to send" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[Upgrade reminder] Error:", e);
    return { ok: false, error: "Failed to send" };
  }
}
