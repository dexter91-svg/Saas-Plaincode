import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";

/** Merchant marks an escalation as seen/being-handled, without needing a reply ready yet. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      "SELECT id, acknowledged_at AS acknowledgedAt FROM forwarded_conversations WHERE id = ? AND user_id = ?",
      [id, auth.userId]
    );
    const list = rows as { id: string; acknowledgedAt: string | null }[];
    if (list.length === 0) {
      await conn.end();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!list[0].acknowledgedAt) {
      await conn.execute(
        "UPDATE forwarded_conversations SET acknowledged_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        [id, auth.userId]
      );
    }
    await conn.end();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forwarded acknowledge error:", err);
    return NextResponse.json({ error: "Failed to acknowledge" }, { status: 500 });
  }
}
