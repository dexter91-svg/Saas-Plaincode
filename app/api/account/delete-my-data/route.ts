import { NextResponse } from "next/server";
import { getAuthFromCookie, clearAuthCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

/**
 * Delete my data: permanently deletes the authenticated user's account
 * and all associated data (cascades: chatbots, conversations, messages,
 * forwarded_conversations, tickets, activity_log, conversation_usage).
 * Use for compliance (e.g. right to erasure).
 */
export async function POST() {
  const auth = await getAuthFromCookie();
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conn = await getDbConnection();
    await conn.execute("DELETE FROM users WHERE id = ?", [auth.userId]);
    await conn.end();
    await clearAuthCookie();
    return NextResponse.json({ ok: true, message: "Account and all associated data have been permanently deleted." });
  } catch (err) {
    console.error("Delete my data error:", err);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact us at hello@plainbot.io." },
      { status: 500 }
    );
  }
}
