import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET() {
  const auth = await getAuthFromCookie();
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      "SELECT shop_domain FROM shopify_connections WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
      [auth.userId]
    );
    await conn.end();
    const row = (rows as { shop_domain: string }[])[0];
    return NextResponse.json(row ? { connected: true, shopDomain: row.shop_domain } : { connected: false });
  } catch (err) {
    console.error("GET /api/shopify/connection error:", err);
    return NextResponse.json({ error: "Failed to check connection" }, { status: 500 });
  }
}
