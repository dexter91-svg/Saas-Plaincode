import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { sendUpgradeReminderEmail } from "@/lib/usage-emails";

/** Current month YYYY-MM */
function currentPeriod(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Send 24h follow-up "upgrade/renew" emails to users who hit their limit.
 * Call this daily (e.g. Vercel Cron or cron-job.org). Protect with CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = currentPeriod();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      `SELECT u.id, u.email, u.name, u.plan, u.last_upgrade_reminder_at AS lastReminder
       FROM users u
       INNER JOIN conversation_usage cu ON cu.user_id = u.id AND cu.period_month = ?
       WHERE u.conversation_limit IS NOT NULL
         AND u.conversation_limit <= cu.count_used
         AND u.limit_reached_period = ?
         AND (u.last_upgrade_reminder_at IS NULL OR u.last_upgrade_reminder_at < ?)`,
      [period, period, twentyFourHoursAgo]
    );
    const users = rows as { id: string; email: string; name: string | null; plan: string; lastReminder: string | null }[];
    await conn.end();

    let sent = 0;
    for (const u of users) {
      const ok = await sendUpgradeReminderEmail(
        u.email,
        u.plan === "free" ? "free" : "pro",
        u.name ?? null
      );
      if (ok.ok) {
        sent++;
        const conn2 = await getDbConnection();
        await conn2.execute(
          "UPDATE users SET last_upgrade_reminder_at = CURRENT_TIMESTAMP WHERE id = ?",
          [u.id]
        );
        await conn2.end();
      }
    }

    return NextResponse.json({ ok: true, sent, total: users.length });
  } catch (err) {
    console.error("[cron/upgrade-reminders]", err);
    return NextResponse.json({ error: "Failed to run reminders" }, { status: 500 });
  }
}
