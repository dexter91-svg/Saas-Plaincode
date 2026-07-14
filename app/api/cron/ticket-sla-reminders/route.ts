import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { sendSlaReminderToCustomer } from "@/lib/send-sla-customer-reminder";

type FcRow = {
  id: string;
  customer_email: string;
  customer: string | null;
  preview: string | null;
  created_at: Date | string;
  reminder_6h_sent_at: Date | string | null;
  reminder_12h_sent_at: Date | string | null;
  reminder_24h_sent_at: Date | string | null;
  storeTitle: string | null;
};

function hoursSince(created: Date | string): number {
  const t = typeof created === "string" ? new Date(created).getTime() : created.getTime();
  return (Date.now() - t) / 3_600_000;
}

/**
 * Pending forwarded tickets: send customer SLA emails at 6h, 12h, 24h (no auto-close).
 * Schedule every 5–10 minutes (e.g. Vercel Cron). Protect with CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("secret");
  const vercelCron = req.headers.get("x-vercel-cron");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && vercelCron !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let conn;
  try {
    conn = await getDbConnection();
  } catch (e) {
    console.error("[cron/ticket-sla-reminders] db", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  let rows: FcRow[];
  try {
    const [r] = await conn.execute(
      `SELECT fc.id, fc.customer_email, fc.customer, fc.preview, fc.created_at,
              fc.reminder_6h_sent_at, fc.reminder_12h_sent_at, fc.reminder_24h_sent_at,
              cb.website_title AS storeTitle
       FROM forwarded_conversations fc
       INNER JOIN conversations c ON c.id = fc.conversation_id
       LEFT JOIN chatbots cb ON cb.id = c.chatbot_id
       WHERE fc.replied_at IS NULL
         AND fc.customer_email IS NOT NULL
         AND TRIM(fc.customer_email) <> ''`
    );
    rows = (r as FcRow[]) || [];
  } catch (e) {
    await conn.end();
    console.error("[cron/ticket-sla-reminders] query", e);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
  await conn.end();

  const stats = { checked: rows.length, sent6: 0, sent12: 0, sent24: 0, failed: 0 };

  for (const row of rows) {
    const h = hoursSince(row.created_at);
    const email = (row.customer_email || "").trim();
    if (!email) continue;

    const run = async (tier: 6 | 12 | 24, col: "reminder_6h_sent_at" | "reminder_12h_sent_at" | "reminder_24h_sent_at") => {
      const sent = row[col];
      if (sent) return false;
      if (h < tier) return false;
      const res = await sendSlaReminderToCustomer(email, tier, {
        customerName: row.customer,
        preview: row.preview ?? undefined,
        storeTitle: row.storeTitle ?? undefined,
      });
      if (!res.ok) {
        stats.failed++;
        return false;
      }
      const c2 = await getDbConnection();
      await c2.execute(`UPDATE forwarded_conversations SET ${col} = CURRENT_TIMESTAMP WHERE id = ?`, [row.id]);
      await c2.end();
      if (tier === 6) stats.sent6++;
      if (tier === 12) stats.sent12++;
      if (tier === 24) stats.sent24++;
      row[col] = new Date() as unknown as string;
      return true;
    };

    await run(6, "reminder_6h_sent_at");
    await run(12, "reminder_12h_sent_at");
    await run(24, "reminder_24h_sent_at");
  }

  return NextResponse.json({ ok: true, ...stats });
}
