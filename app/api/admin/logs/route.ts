import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500);

  try {
    const conn = await getDbConnection();
    const params: (string | number)[] = [];
    let query = `
      SELECT cl.id, cl.url, cl.status, cl.store_type AS storeType, cl.products_found AS productsFound,
             cl.duration_ms AS durationMs, cl.error_message AS errorMessage,
             cl.created_at AS createdAt, u.email AS userEmail
      FROM crawl_logs cl
      LEFT JOIN users u ON u.id = CONVERT(cl.user_id USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
      WHERE 1 = 1
    `;
    if (status && ["success", "failed", "timeout", "captcha"].includes(status)) {
      query += " AND cl.status = ?";
      params.push(status);
    }
    query += ` ORDER BY cl.created_at DESC LIMIT ${limit}`;

    const [rows] = await conn.execute(query, params);
    await conn.end();
    return NextResponse.json({ logs: rows });
  } catch (err) {
    console.error("GET /api/admin/logs error:", err);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
