import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const conn = await getDbConnection();
    const [rows] = await conn.execute("SELECT resend_api_key AS resendApiKey FROM users WHERE id = ?", [auth.userId]);
    await conn.end();
    const key = (rows as { resendApiKey: string | null }[])[0]?.resendApiKey ?? null;
    return NextResponse.json({ hasKey: !!key });
  } catch (err) {
    console.error("GET resend-key:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const key = typeof body.resendApiKey === "string" ? body.resendApiKey.trim() : null;
    if (key !== null && key !== "" && !key.startsWith("re_")) {
      return NextResponse.json({ error: "Invalid Resend API key — it should start with re_" }, { status: 400 });
    }
    const conn = await getDbConnection();
    await conn.execute("UPDATE users SET resend_api_key = ? WHERE id = ?", [key || null, auth.userId]);
    await conn.end();
    return NextResponse.json({ ok: true, hasKey: !!key });
  } catch (err) {
    console.error("PATCH resend-key:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
