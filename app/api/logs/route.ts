import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200);

  try {
    const conn = await getDbConnection();
    const params: (string | number)[] = [auth.userId];
    let query = `
      SELECT id, url, status, store_type AS storeType, products_found AS productsFound,
             duration_ms AS durationMs, error_message AS errorMessage,
             created_at AS createdAt
      FROM crawl_logs
      WHERE user_id = ?
    `;
    if (status && ["success", "failed", "timeout", "captcha"].includes(status)) {
      query += " AND status = ?";
      params.push(status);
    }
    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const [rows] = await conn.execute(query, params);
    await conn.end();
    return NextResponse.json({ logs: rows });
  } catch (err) {
    console.error("GET /api/logs error:", err);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
