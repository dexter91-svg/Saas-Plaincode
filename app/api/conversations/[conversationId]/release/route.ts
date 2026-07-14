import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { randomUUID } from "crypto";
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
    await setHandoffMode(conn, conversationId, "ai", null);
    const note =
      "You're back with our AI assistant. A team member was helping you — ask anything and we'll pick up from here.";
    const msgId = randomUUID();
    await conn.execute(
      "INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
      [msgId, conversationId, note]
    );
    return NextResponse.json({ ok: true, handoffMode: "ai", resumeMessageId: msgId });
  } catch (err) {
    console.error("Release error:", err);
    return NextResponse.json({ error: "Failed to release conversation" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
