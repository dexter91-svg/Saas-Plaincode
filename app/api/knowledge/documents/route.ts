import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = req.nextUrl.searchParams.get("chatbotId")?.trim() ?? "";
  const conn = await getDbConnection();
  try {
    let chatbotId: string | null = requested || null;
    if (chatbotId) {
      const [owned] = await conn.execute("SELECT id FROM chatbots WHERE id = ? AND user_id = ?", [
        chatbotId,
        auth.userId,
      ]);
      if ((owned as { id: string }[]).length === 0) chatbotId = null;
    }
    if (!chatbotId) {
      const [rows] = await conn.execute(
        "SELECT id FROM chatbots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [auth.userId]
      );
      const bots = rows as { id: string }[];
      if (bots.length > 0) chatbotId = bots[0].id;
    }
    if (!chatbotId) {
      return NextResponse.json({ documents: [] });
    }

    const [rows] = await conn.execute(
      "SELECT id, file_name AS fileName, created_at AS createdAt FROM chatbot_documents WHERE chatbot_id = ? ORDER BY created_at DESC",
      [chatbotId]
    );
    return NextResponse.json({ documents: rows });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({ documents: [] });
    }
    throw e;
  } finally {
    await conn.end();
  }
}
