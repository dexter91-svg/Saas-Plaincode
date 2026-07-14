import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET() {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      `SELECT id, email, name, plan, conversation_limit AS conversationLimit, complimentary_credits AS complimentaryCredits, created_at AS createdAt 
       FROM users ORDER BY created_at DESC`
    );
    await conn.end();
    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
