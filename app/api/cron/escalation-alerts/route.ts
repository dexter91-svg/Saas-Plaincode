import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { sendEscalationAlertEmail } from "@/lib/send-escalation-alert";

type Row = {
  id: string;
  customer: string | null;
  customer_email: string | null;
  preview: string | null;
  order_ref: string | null;
  created_at: Date | string;
  alertEmail: string;
  alertMinutes: number;
};

/**
 * Emails store owners about escalations still in "New" (not acknowledged, not replied)
 * once they've waited longer than the owner's chosen timer. Each escalation alerts once.
 * Runs every few minutes (see vercel.json). Protected by CRON_SECRET when it is set.
 */
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("secret");
  const vercelCron = req.headers.get("x-vercel-cron");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && vercelCron !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await getDbConnection();
  let rows: Row[];
  try {
    const [r] = await conn.execute(
      `SELECT fc.id, fc.customer, fc.customer_email, fc.preview, fc.order_ref, fc.created_at,
              u.escalation_alert_email AS alertEmail, u.escalation_alert_minutes AS alertMinutes
       FROM forwarded_conversations fc
       INNER JOIN users u ON u.id = fc.user_id
       WHERE fc.replied_at IS NULL
         AND fc.acknowledged_at IS NULL
         AND (fc.merchant_alerted_at IS NULL OR fc.merchant_alerted_at < DATE_SUB(NOW(), INTERVAL 24 HOUR))
         AND u.escalation_alert_minutes IS NOT NULL
         AND u.escalation_alert_email IS NOT NULL
         AND TRIM(u.escalation_alert_email) <> ''`
    );
    rows = (r as Row[]) || [];
  } catch (e) {
    await conn.end();
    console.error("[cron/escalation-alerts] query", e);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const stats = { checked: rows.length, due: 0, sent: 0, failed: 0 };
  const now = Date.now();

  for (const row of rows) {
    const waitingMinutes = (now - new Date(row.created_at).getTime()) / 60_000;
    if (waitingMinutes < Number(row.alertMinutes)) continue;
    stats.due++;

    const result = await sendEscalationAlertEmail(row.alertEmail.trim(), {
      customer: row.customer || "A customer",
      customerEmail: row.customer_email,
      preview: row.preview || "",
      orderRef: row.order_ref,
      waitingMinutes,
    });

    if (!result.ok) {
      stats.failed++;
      continue;
    }
    await conn.execute("UPDATE forwarded_conversations SET merchant_alerted_at = CURRENT_TIMESTAMP WHERE id = ?", [
      row.id,
    ]);
    stats.sent++;
  }

  await conn.end();
  return NextResponse.json({ ok: true, ...stats });
}
