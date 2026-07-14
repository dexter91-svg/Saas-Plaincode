import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = typeof body.forwardEmail === "string" ? body.forwardEmail.trim() : "";

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const conn = await getDbConnection();
    await conn.execute(
      "UPDATE users SET forward_email = ? WHERE id = ?",
      [email, auth.userId]
    );
    await conn.end();

    return NextResponse.json({ ok: true, forwardEmail: email });
  } catch (err) {
    console.error("Forward email update error:", err);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await getDbConnection();
    try {
      const [rows] = await conn.execute(
        "SELECT forward_email FROM users WHERE id = ?",
        [auth.userId]
      );
      const users = rows as { forward_email: string | null }[];
      const forwardEmail = users[0]?.forward_email ?? null;
      await conn.end();
      return NextResponse.json({ forwardEmail });
    } catch (colErr) {
      await conn.end();
      return NextResponse.json({ forwardEmail: null });
    }
  } catch (err) {
    console.error("Forward email fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
