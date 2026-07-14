/**
 * Welcome emails via Resend (Free signup; paid plans after Stripe checkout).
 * Uses: RESEND_API_KEY, EMAIL_FROM (e.g. hello@plainbot.io), NEXT_PUBLIC_APP_URL (for links).
 */

import type { BillingPlan } from "@/lib/plans";

const FROM_EMAIL = "hello@plainbot.io";

const PLAN_LABEL: Record<Exclude<BillingPlan, "free">, string> = {
  growth: "Growth",
  pro: "Pro",
  agency: "Agency",
};

function getFrom(): string {
  return process.env.EMAIL_FROM || FROM_EMAIL;
}

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (url) return url.startsWith("http") ? url : `https://${url}`;
  return "https://yourapp.com";
}

export async function sendFreeWelcomeEmail(to: string, name?: string | null): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Welcome email] RESEND_API_KEY missing — Free welcome not sent.");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const greeting = name ? `Hi ${name},` : "Hi,";
  const body = [
    greeting,
    "",
    "Welcome to Plainbot! You're on the Free plan.",
    "",
    "You can connect your store, train your chatbot, and add the widget to your site from your dashboard.",
    "",
    `Log in here: ${getBaseUrl()}/login`,
    "",
    "If you have any questions, reply to this email or contact us at hello@plainbot.io.",
    "",
    "— The Plainbot team",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: getFrom(),
        to: [to.trim()],
        subject: "Welcome to Plainbot",
        text: body,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Welcome email] Resend failed:", res.status, err);
      return { ok: false, error: "Failed to send" };
    }
    return { ok: true };
  } catch (e) {
    clearTimeout(timeout);
    console.error("[Welcome email] Error:", e);
    return { ok: false, error: "Failed to send" };
  }
}

/** After Stripe checkout (Growth, Pro, or Agency). */
export async function sendPaidPlanWelcomeEmail(
  to: string,
  name: string | null | undefined,
  plan: Exclude<BillingPlan, "free">
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Welcome email] RESEND_API_KEY missing — paid welcome not sent.");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const greeting = name ? `Hi ${name},` : "Hi,";
  const label = PLAN_LABEL[plan];
  const body = [
    greeting,
    "",
    `Thanks — your Plainbot ${label} subscription is active.`,
    "",
    "Open your dashboard to connect stores, train your chatbot, and install the widget on your site.",
    "",
    `Log in: ${getBaseUrl()}/login`,
    "",
    "— The Plainbot team",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: getFrom(),
        to: [to.trim()],
        subject: `Welcome to Plainbot ${label}`,
        text: body,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Paid welcome email] Resend failed:", res.status, err);
      return { ok: false, error: "Failed to send" };
    }
    return { ok: true };
  } catch (e) {
    clearTimeout(timeout);
    console.error("[Paid welcome email] Error:", e);
    return { ok: false, error: "Failed to send" };
  }
}
