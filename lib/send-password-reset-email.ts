/**
 * Password reset email via Resend.
 */

import { postToResend } from "@/lib/resend-request";

function getFrom(): string {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (url) return url.startsWith("http") ? url : `https://${url}`;
  return "http://localhost:3000";
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  resendApiKey?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = resendApiKey?.trim() || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Password reset] RESEND_API_KEY missing — email not sent.");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const base = getBaseUrl().replace(/\/$/, "");
  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  const body = [
    "You asked to reset your Plainbot password.",
    "",
    `Open this link (valid for 1 hour):`,
    link,
    "",
    "If you didn’t request this, you can ignore this email.",
  ].join("\n");

  try {
    const res = await postToResend("/emails", apiKey, {
      from: getFrom(),
      to: [to],
      subject: "Reset your Plainbot password",
      text: body,
    });
    if (!res.ok) {
      console.error("[Password reset] Resend error:", res.status, res.json);
      return { ok: false, error: "Email send failed" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[Password reset] send error:", e);
    return { ok: false, error: "Email send failed" };
  }
}
