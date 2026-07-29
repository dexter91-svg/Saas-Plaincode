import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { conversationHandoffColumnsExist } from "@/lib/conversation-handoff";

async function humanRequestColumnExists(conn: Awaited<ReturnType<typeof getDbConnection>>): Promise<boolean> {
  try {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'requests_human'
       LIMIT 1`
    );
    return Array.isArray(rows) && (rows as unknown[]).length > 0;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatbotId = req.nextUrl.searchParams.get("chatbotId")?.trim() || null;

  try {
    const conn = await getDbConnection();
    const [hasHandoff, hasHumanRequest] = await Promise.all([
      conversationHandoffColumnsExist(conn),
      humanRequestColumnExists(conn),
    ]);
    const params: (string | null)[] = [auth.userId];
    let botFilter = "";
    if (chatbotId) {
      botFilter = " AND b.id = ?";
      params.push(chatbotId);
    }

    const handoffSelect = hasHandoff
      ? "c.handoff_mode AS handoffMode, c.assigned_agent_id AS assignedAgentId,"
      : "'ai' AS handoffMode, NULL AS assignedAgentId,";

    const humanRequestSelect = hasHumanRequest
      ? "c.requests_human AS requestsHuman,"
      : "0 AS requestsHuman,";

    const [rows] = await conn.execute(
      `SELECT c.id, c.customer_name AS customerName, c.customer_email AS customerEmail,
       c.status, c.created_at AS createdAt, c.updated_at AS updatedAt,
       ${handoffSelect}
       ${humanRequestSelect}
       (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS lastMessage,
       (SELECT role FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS lastMessageRole,
       (SELECT created_at FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS lastMessageAt,
       (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) AS messageCount,
       (SELECT id FROM chat_messages WHERE conversation_id = c.id AND role = 'user' ORDER BY created_at DESC LIMIT 1) AS lastUserMessageId,
       (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND role = 'user') AS userMessageCount
       FROM conversations c
       INNER JOIN chatbots b ON b.id = c.chatbot_id AND b.user_id = ?${botFilter}
       ORDER BY COALESCE(
         (SELECT created_at FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
         c.updated_at,
         c.created_at
       ) DESC
       LIMIT 100`,
      params
    );
    await conn.end();

    const now = Date.now();
    const mapped = (
      rows as {
        id: string;
        customerName: string | null;
        customerEmail: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        handoffMode: string;
        assignedAgentId: string | null;
        requestsHuman: number | boolean;
        lastMessage: string | null;
        lastMessageRole: string | null;
        lastMessageAt: Date | null;
        messageCount: number;
        lastUserMessageId: string | null;
        userMessageCount: number;
      }[]
    ).map((r) => {
      const lastAt = r.lastMessageAt ? new Date(r.lastMessageAt).getTime() : 0;
      const isLive = lastAt > 0 && now - lastAt < 180_000;
      return {
        id: r.id,
        customer: r.customerName || r.customerEmail || "Guest",
        preview: r.lastMessage || "No messages",
        date: r.lastMessageAt || r.updatedAt || r.createdAt,
        status: r.status,
        handoffMode: r.handoffMode === "human" ? "human" : ("ai" as "human" | "ai"),
        assignedAgentId: r.assignedAgentId,
        requestsHuman: Boolean(r.requestsHuman),
        isLive,
        lastMessageRole: r.lastMessageRole,
        messageCount: Number(r.messageCount) || 0,
        lastUserMessageId: r.lastUserMessageId ?? null,
        userMessageCount: Number(r.userMessageCount) || 0,
      };
    });

    // Pin conversations requesting a human to the top, then sort by last activity.
    mapped.sort((a, b) => {
      if (a.requestsHuman !== b.requestsHuman) return a.requestsHuman ? -1 : 1;
      return 0;
    });

    return NextResponse.json({ conversations: mapped });
  } catch (err) {
    console.error("GET /api/conversations:", err);
    return NextResponse.json({ error: "Failed to load conversations." }, { status: 500 });
  }
}
