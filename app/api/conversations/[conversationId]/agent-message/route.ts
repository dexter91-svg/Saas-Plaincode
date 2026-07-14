import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { randomUUID } from "crypto";
import { getHandoffState, verifyConversationOwner } from "@/lib/conversation-handoff";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthFromCookie();
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!conversationId || !content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const conn = await getDbConnection();
  try {
    const owned = await verifyConversationOwner(conn, conversationId, auth.userId);
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const state = await getHandoffState(conn, conversationId);
    if (state.handoffMode !== "human") {
      return NextResponse.json({ error: "Take the chat first before sending messages." }, { status: 409 });
    }
    if (state.assignedAgentId && state.assignedAgentId !== auth.userId) {
      return NextResponse.json({ error: "Another agent has this chat." }, { status: 409 });
    }

    const msgId = randomUUID();
    try {
      await conn.execute(
        "INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, 'agent', ?)",
        [msgId, conversationId, content]
      );
    } catch (insertErr: unknown) {
      const e = insertErr as { code?: string };
      if (e?.code === "WARN_DATA_TRUNCATED" || e?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD" || e?.code === "ER_DATA_TOO_LONG") {
        await conn.execute(
          "INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
          [msgId, conversationId, `[Support team member]: ${content}`]
        );
      } else {
        throw insertErr;
      }
    }
    await conn.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [conversationId]);

    return NextResponse.json({ ok: true, message: { id: msgId, role: "agent", content } });
  } catch (err) {
    console.error("Agent message error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
