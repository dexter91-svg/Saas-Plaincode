import type { PoolConnection } from "mysql2/promise";

export type HandoffMode = "ai" | "human";

export type ChatMessageRow = {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  createdAt?: string;
};

export async function conversationHandoffColumnsExist(conn: PoolConnection): Promise<boolean> {
  try {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'handoff_mode'
       LIMIT 1`
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function getHandoffMode(conn: PoolConnection, conversationId: string): Promise<HandoffMode> {
  const has = await conversationHandoffColumnsExist(conn);
  if (!has) return "ai";
  const [rows] = await conn.execute(
    "SELECT handoff_mode AS handoffMode FROM conversations WHERE id = ? LIMIT 1",
    [conversationId]
  );
  const mode = (rows as { handoffMode?: string }[])[0]?.handoffMode;
  return mode === "human" ? "human" : "ai";
}

export async function getHandoffState(
  conn: PoolConnection,
  conversationId: string
): Promise<{ handoffMode: HandoffMode; assignedAgentId: string | null }> {
  const has = await conversationHandoffColumnsExist(conn);
  if (!has) return { handoffMode: "ai", assignedAgentId: null };
  const [rows] = await conn.execute(
    "SELECT handoff_mode AS handoffMode, assigned_agent_id AS assignedAgentId FROM conversations WHERE id = ? LIMIT 1",
    [conversationId]
  );
  const r = (rows as { handoffMode?: string; assignedAgentId?: string | null }[])[0];
  return {
    handoffMode: r?.handoffMode === "human" ? "human" : "ai",
    assignedAgentId: r?.assignedAgentId ?? null,
  };
}

export async function setHandoffMode(
  conn: PoolConnection,
  conversationId: string,
  mode: HandoffMode,
  assignedAgentId: string | null
): Promise<void> {
  const has = await conversationHandoffColumnsExist(conn);
  if (!has) return;
  await conn.execute(
    "UPDATE conversations SET handoff_mode = ?, assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [mode, mode === "human" ? assignedAgentId : null, conversationId]
  );
}

/** Map DB rows to OpenAI history (agent lines preserved for AI context after release). */
export function toOpenAIHistoryMessages(
  rows: { role: string; content: string }[]
): { role: "user" | "assistant"; content: string }[] {
  return rows
    .filter((m) => {
      const r = m.role;
      return (
        (r === "user" || r === "assistant" || r === "agent") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
      );
    })
    .map((m) => {
      if (m.role === "user") {
        return { role: "user" as const, content: m.content.trim().slice(0, 2000) };
      }
      const content =
        m.role === "agent"
          ? `[Support team member]: ${m.content.trim()}`.slice(0, 2000)
          : m.content.trim().slice(0, 2000);
      return { role: "assistant" as const, content };
    });
}

export async function verifyConversationOwner(
  conn: PoolConnection,
  conversationId: string,
  userId: string
): Promise<{ chatbotId: string } | null> {
  const [rows] = await conn.execute(
    `SELECT c.chatbot_id AS chatbotId
     FROM conversations c
     INNER JOIN chatbots b ON b.id = c.chatbot_id AND b.user_id = ?
     WHERE c.id = ?
     LIMIT 1`,
    [userId, conversationId]
  );
  const r = (rows as { chatbotId: string }[])[0];
  return r ? { chatbotId: r.chatbotId } : null;
}
