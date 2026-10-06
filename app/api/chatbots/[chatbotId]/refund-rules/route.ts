import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ chatbotId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { chatbotId } = await params;
    if (!chatbotId) return NextResponse.json({ error: "Missing chatbot id" }, { status: 400 });

    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      "SELECT refund_enabled AS refundEnabled, refund_max_amount AS refundMaxAmount, refund_window_days AS refundWindowDays FROM chatbots WHERE id = ? AND user_id = ?",
      [chatbotId, auth.userId]
    );
    await conn.end();
    const row = (rows as { refundEnabled: number; refundMaxAmount: number | null; refundWindowDays: number | null }[])[0];
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      refundEnabled: !!row.refundEnabled,
      refundMaxAmount: row.refundMaxAmount ?? null,
      refundWindowDays: row.refundWindowDays ?? null,
    });
  } catch (err) {
    console.error("GET refund-rules:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { chatbotId } = await params;
    if (!chatbotId) return NextResponse.json({ error: "Missing chatbot id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const refundEnabled = typeof body.refundEnabled === "boolean" ? (body.refundEnabled ? 1 : 0) : undefined;
    const refundMaxAmount =
      body.refundMaxAmount === null ? null :
      typeof body.refundMaxAmount === "number" && body.refundMaxAmount > 0 ? body.refundMaxAmount : undefined;
    const refundWindowDays =
      body.refundWindowDays === null ? null :
      typeof body.refundWindowDays === "number" && body.refundWindowDays > 0 ? Math.round(body.refundWindowDays) : undefined;

    const setParts: string[] = [];
    const vals: (number | null)[] = [];
    if (refundEnabled !== undefined) { setParts.push("refund_enabled = ?"); vals.push(refundEnabled); }
    if (refundMaxAmount !== undefined) { setParts.push("refund_max_amount = ?"); vals.push(refundMaxAmount); }
    if (refundWindowDays !== undefined) { setParts.push("refund_window_days = ?"); vals.push(refundWindowDays); }

    if (setParts.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const conn = await getDbConnection();
    const [check] = await conn.execute("SELECT id FROM chatbots WHERE id = ? AND user_id = ?", [chatbotId, auth.userId]);
    if ((check as { id: string }[]).length === 0) {
      await conn.end();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await conn.execute(`UPDATE chatbots SET ${setParts.join(", ")} WHERE id = ?`, [...vals, chatbotId]);
    await conn.end();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH refund-rules:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
