import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { canAddStore, storeLimitForPlan } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Delete a store (chatbot) owned by the current user. Cascades to conversations, chunks, etc.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { chatbotId } = await params;
  const id = chatbotId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing chatbot id" }, { status: 400 });
  }

  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute("SELECT id FROM chatbots WHERE id = ? AND user_id = ?", [id, auth.userId]);
    if ((rows as { id: string }[]).length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await conn.execute("DELETE FROM chatbots WHERE id = ? AND user_id = ?", [id, auth.userId]);

    const [planRows] = await conn.execute("SELECT plan FROM users WHERE id = ?", [auth.userId]);
    const plan = (planRows as { plan: string }[])[0]?.plan ?? "free";
    const [remaining] = await conn.execute("SELECT id FROM chatbots WHERE user_id = ? ORDER BY created_at ASC", [auth.userId]);
    const rest = (remaining as { id: string }[]).map((r) => r.id);
    return NextResponse.json({ ok: true, deletedId: id, remainingChatbotIds: rest, canAddStore: canAddStore(plan, rest.length), storeLimit: storeLimitForPlan(plan) });
  } finally {
    await conn.end();
  }
}
