import { NextResponse } from "next/server";
import { createToken, getAuthFromCookie, setAuthCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

/** Re-issue JWT with plan from DB (after Stripe checkout or subscription upgrade). */
export async function POST() {
  const auth = await getAuthFromCookie();
  if (!auth?.userId || !auth.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const conn = await getDbConnection();
    const [rows] = await conn.execute("SELECT plan FROM users WHERE id = ?", [auth.userId]);
    await conn.end();
    const plan = (rows as { plan?: string }[])[0]?.plan || auth.plan || "free";
    const token = createToken({ userId: auth.userId, email: auth.email, plan });
    await setAuthCookie(token);
    return NextResponse.json({ ok: true, plan });
  } catch {
    return NextResponse.json({ error: "Failed to refresh session" }, { status: 500 });
  }
}
