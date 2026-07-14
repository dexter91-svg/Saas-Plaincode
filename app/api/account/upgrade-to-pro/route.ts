import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

/**
 * Dev helper: set plan to Pro (3,000 conversations). Production upgrades use Stripe.
 */
export async function POST() {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conn = await getDbConnection();
    await conn.execute(
      `UPDATE users SET plan = 'pro', conversation_limit = 3000,
       limit_reached_period = NULL, last_upgrade_reminder_at = NULL
       WHERE id = ?`,
      [auth.userId]
    );
    await conn.end();
    return NextResponse.json({ ok: true, plan: "pro", conversationLimit: 3000 });
  } catch (err) {
    console.error("POST /api/account/upgrade-to-pro:", err);
    return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
  }
}
