import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : 1000;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const conn = await getDbConnection();
    
    // Check if user exists
    const [userRows] = await conn.execute(
      "SELECT id, email, complimentary_credits AS currentCredits FROM users WHERE id = ?",
      [userId]
    );
    const user = (userRows as { id: string; email: string; currentCredits: number }[])[0];
    if (!user) {
      await conn.end();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nextCredits = user.currentCredits + amount;
    await conn.execute(
      "UPDATE users SET complimentary_credits = ? WHERE id = ?",
      [nextCredits, userId]
    );
    
    // Log system activity event
    try {
      await conn.execute(
        "INSERT INTO activity_log (id, user_id, type, title, detail) VALUES (UUID(), ?, 'system', ?, ?)",
        [userId, "Credits added", `Admin added ${amount} complimentary credits (New balance: ${nextCredits})`]
      );
    } catch (e) {
      console.error("Failed to write to activity_log:", e);
    }

    await conn.end();
    return NextResponse.json({ ok: true, complimentaryCredits: nextCredits });
  } catch (err) {
    console.error("POST /api/admin/users/credits error:", err);
    return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
  }
}
