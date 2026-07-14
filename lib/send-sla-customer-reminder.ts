type Tier = 6 | 12 | 24;

function subjectFor(tier: Tier, storeName?: string): string {
  const s = (storeName || "").replace(/\s+/g, " ").trim() || "our team";
  if (tier === 6) return `Update on your support request – ${s}`;
  if (tier === 12) return `We’re still working on your request – ${s}`;
  return `Your request is still with our team – ${s}`;
}

function bodyFor(
  tier: Tier,
  customerName: string | null | undefined,
  preview: string
): string {
  const hi = customerName ? `Hi ${customerName},` : "Hi,";
  const line = (preview || "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (tier === 6) {
    return [
      hi,
      "",
      "We’re sorry it’s taking a little longer than usual to get you a full reply.",
      "Your request is still with our support team and under review.",
      line ? `Regarding: “${line}”` : "",
      "",
      "We’ll follow up with you by email as soon as possible. You don’t need to do anything for now—thank you for your patience.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (tier === 12) {
    return [
      hi,
      "",
      "We’re still working through your case and want to be transparent: your request is still in progress and being checked by our team.",
      line ? `Context: “${line}”` : "",
      "",
      "We’re sorry for the delay. If we need anything else from you, we’ll email you. Otherwise we’ll be in touch with an update soon.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    hi,
    "",
    "Your support request has been with us for some time, and we’re sorry you haven’t had a final answer yet. Our team is still reviewing and will reach out by email.",
    line ? `Request: “${line}”` : "",
    "",
    "We appreciate you sticking with us—your ticket stays open until we resolve it.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * SLA reminder to customer (6h / 12h / 24h) — not the same as “support replied” email.
 * Reuses the same Resend path with a custom subject so it’s clearly operational.
 */
export async function sendSlaReminderToCustomer(
  customerEmail: string,
  tier: Tier,
  opts?: { customerName?: string | null; preview?: string; storeTitle?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const to = customerEmail.trim();
  if (!to) return { ok: false, error: "No customer email" };

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const store = (opts?.storeTitle || "").replace(/\s+/g, " ").trim() || "our team";
  const subj = subjectFor(tier, store);
  const text = bodyFor(tier, opts?.customerName, opts?.preview || "");

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
        subject: subj,
        text,
      }),
      signal: abort.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[SLA reminder] Resend failed:", res.status, err);
      return { ok: false, error: "Failed to send email" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[SLA reminder] Error:", e);
    return { ok: false, error: "Failed to send email" };
  }
}
