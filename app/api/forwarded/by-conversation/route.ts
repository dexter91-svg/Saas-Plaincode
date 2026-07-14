import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

export const dynamic = "force-dynamic";

/** Public: get support reply for a conversation (so chat/widget can show support reply) */
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400, headers: corsHeaders });
    }

    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      `SELECT reply_text AS replyText, replied_at AS repliedAt, created_at AS forwardedAt,
              customer_email AS customerEmail
       FROM forwarded_conversations
       WHERE conversation_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [conversationId]
    );
    await conn.end();

    const row = (rows as {
      replyText: string | null;
      repliedAt: string | null;
      forwardedAt: string;
      customerEmail: string | null;
    }[])[0];
    if (!row) {
      return NextResponse.json(
        {
          replyText: null,
          repliedAt: null,
          forwardedAt: null,
          forwardPending: false,
          needsForm: false,
        },
        { headers: corsHeaders }
      );
    }

    const hasReply = Boolean(row.repliedAt) || (Boolean(row.replyText) && String(row.replyText).trim().length > 0);
    const needsForm = !hasReply && !row.customerEmail?.trim();
    const forwardPending = !hasReply && !needsForm;

    return NextResponse.json(
      {
        replyText: row.replyText && String(row.replyText).trim() ? row.replyText : null,
        repliedAt: row.repliedAt,
        forwardedAt: row.forwardedAt,
        forwardPending,
        needsForm,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Forwarded by-conversation error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500, headers: corsHeaders });
  }
}
