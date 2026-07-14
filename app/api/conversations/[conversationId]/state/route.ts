import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { getHandoffState, verifyConversationOwner } from "@/lib/conversation-handoff";

export async function GET(
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
    const state = await getHandoffState(conn, conversationId);
    const [lastRows] = await conn.execute(
      `SELECT created_at AS createdAt FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`,
      [conversationId]
    );
    const lastAt = (lastRows as { createdAt: Date }[])[0]?.createdAt;
    const isLive = lastAt ? Date.now() - new Date(lastAt).getTime() < 180_000 : false;

    return NextResponse.json({
      handoffMode: state.handoffMode,
      assignedAgentId: state.assignedAgentId,
      isLive,
      lastMessageAt: lastAt ?? null,
    });
  } catch (err) {
    console.error("Conversation state error:", err);
    return NextResponse.json({ error: "Failed to load state" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
