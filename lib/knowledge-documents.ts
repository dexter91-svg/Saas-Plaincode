import type { PoolConnection } from "mysql2/promise";

/**
 * Text for the AI prompt: all rows in `chatbot_documents`, else legacy `uploaded_docs_text`
 * (so we do not duplicate after migrating legacy into the table).
 */
export async function getMergedUploadedDocsText(
  conn: PoolConnection,
  chatbotId: string,
  legacyUploadedDocsText: string | null | undefined
): Promise<string> {
  try {
    const [rows] = await conn.execute(
      "SELECT file_name AS fileName, content FROM chatbot_documents WHERE chatbot_id = ? ORDER BY created_at ASC",
      [chatbotId]
    );
    const list = rows as { fileName: string; content: string }[];
    if (list.length > 0) {
      return list
        .map((r) => {
          const name = (r.fileName || "document").trim() || "document";
          return `--- ${name} ---\n${(r.content ?? "").trim()}`;
        })
        .filter((s) => s.length > 0)
        .join("\n\n");
    }
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code !== "ER_NO_SUCH_TABLE") throw e;
  }

  return (legacyUploadedDocsText ?? "").trim();
}
