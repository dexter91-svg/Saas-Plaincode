import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { setHandoffMode, verifyConversationOwner } from "@/lib/conversation-handoff";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthFromCookie();
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }

  const conn = await getDbConnection();
  try {
    const owned = await verifyConversationOwner(conn, conversationId, auth.userId);
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await setHandoffMode(conn, conversationId, "human", auth.userId);
    await conn.execute("UPDATE conversations SET status = 'open' WHERE id = ?", [conversationId]);
    return NextResponse.json({ ok: true, handoffMode: "human", assignedAgentId: auth.userId });
  } catch (err) {
    console.error("Takeover error:", err);
    return NextResponse.json({ error: "Failed to take conversation" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
