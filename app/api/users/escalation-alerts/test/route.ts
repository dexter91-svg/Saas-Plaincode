import { NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";
import { sendEscalationAlertTest } from "@/lib/send-escalation-alert";

export async function POST() {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const conn = await getDbConnection();
    const [rows] = await conn.execute("SELECT escalation_alert_email AS email, resend_api_key AS resendApiKey FROM users WHERE id = ?", [auth.userId]);
    await conn.end();
    const row = (rows as { email: string | null; resendApiKey: string | null }[])[0];
    const email = row?.email?.trim();
    if (!email) {
      return NextResponse.json({ error: "Save an alert email first." }, { status: 400 });
    }
    const result = await sendEscalationAlertTest(email, row?.resendApiKey);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed to send test email." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sentTo: email });
  } catch (err) {
    console.error("Escalation alert test:", err);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
