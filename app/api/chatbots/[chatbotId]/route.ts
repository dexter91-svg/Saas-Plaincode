import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { canAddStore, storeLimitForPlan } from "@/lib/plans";
import { reindexChatbot } from "@/lib/rag";

export const runtime = "nodejs";

/** Update website content for an existing chatbot (e.g. after re-running analysis). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const auth = await getAuthFromCookie();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatbotId } = await params;
  const id = chatbotId?.trim();
  if (!id) return NextResponse.json({ error: "Missing chatbot id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : null;
  const websiteTitle = typeof body.websiteTitle === "string" ? body.websiteTitle.trim() : null;
  const websiteDescription = typeof body.websiteDescription === "string" ? body.websiteDescription.trim() : null;
  const websiteContent = typeof body.websiteContent === "string" ? body.websiteContent : null;
  const products = Array.isArray(body.products) ? body.products : null;

  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute(
      "SELECT id FROM chatbots WHERE id = ? AND user_id = ?",
      [id, auth.userId]
    );
    if ((rows as { id: string }[]).length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const setParts: string[] = [];
    const vals: (string | null)[] = [];
    if (websiteUrl !== null) { setParts.push("website_url = ?"); vals.push(websiteUrl); }
    if (websiteTitle !== null) { setParts.push("website_title = ?"); vals.push(websiteTitle); }
    if (websiteDescription !== null) { setParts.push("website_description = ?"); vals.push(websiteDescription); }
    if (websiteContent !== null) { setParts.push("website_content = ?"); vals.push(websiteContent); }
    if (products !== null) { setParts.push("products_json = ?"); vals.push(JSON.stringify(products)); }

    if (setParts.length > 0) {
      vals.push(id, auth.userId);
      await conn.execute(
        `UPDATE chatbots SET ${setParts.join(", ")} WHERE id = ? AND user_id = ?`,
        vals
      );
      try { await reindexChatbot(conn, id); } catch (e) { console.error("[RAG] reindex after PATCH:", e); }
    }

    return NextResponse.json({ ok: true, chatbot: { id } });
  } finally {
    await conn.end();
  }
}

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
