import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";

const MAX_MINUTES = 60 * 24 * 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      "SELECT escalation_alert_email AS email, escalation_alert_minutes AS minutes FROM users WHERE id = ?",
      [auth.userId]
    );
    await conn.end();
    const r = (rows as { email: string | null; minutes: number | null }[])[0];
    return NextResponse.json({ email: r?.email ?? null, minutes: r?.minutes ?? null });
  } catch (err) {
    console.error("Escalation alerts GET:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    // null = alerts off, 0 = instant, otherwise minutes (capped at one week).
    let minutes: number | null = null;
    if (body.minutes !== null && body.minutes !== undefined) {
      const n = Number(body.minutes);
      if (!Number.isInteger(n) || n < 0 || n > MAX_MINUTES) {
        return NextResponse.json(
          { error: `Timer must be a whole number of minutes between 0 and ${MAX_MINUTES}.` },
          { status: 400 }
        );
      }
      minutes = n;
    }
    if (minutes !== null && !email) {
      return NextResponse.json({ error: "Add an alert email before turning on the timer." }, { status: 400 });
    }

    const conn = await getDbConnection();
    await conn.execute(
      "UPDATE users SET escalation_alert_email = ?, escalation_alert_minutes = ? WHERE id = ?",
      [email || null, minutes, auth.userId]
    );
    await conn.end();

    return NextResponse.json({ ok: true, email: email || null, minutes });
  } catch (err) {
    console.error("Escalation alerts PATCH:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
