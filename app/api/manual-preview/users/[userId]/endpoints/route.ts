import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { randomUUID } from "crypto";

const DEV_ONLY = process.env.NODE_ENV !== "production";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!DEV_ONLY) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
    const authType = typeof body.authType === "string" && ["none", "bearer", "api_key_header", "basic"].includes(body.authType)
      ? body.authType
      : "none";
    const authValue = typeof body.authValue === "string" ? body.authValue.trim() : null;
    if (!name || !baseUrl) {
      return NextResponse.json({ error: "name and baseUrl required" }, { status: 400 });
    }
    const conn = await getDbConnection();
    const id = randomUUID();
    await conn.execute(
      "INSERT INTO user_external_endpoints (id, user_id, name, base_url, auth_type, auth_value, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [id, userId, name, baseUrl, authType, authValue]
    );
    await conn.end();
    return NextResponse.json({ ok: true, id, name, baseUrl, authType });
  } catch (err) {
    console.error("Add endpoint error:", err);
    return NextResponse.json({ error: "Failed to add endpoint. Run migration 003 if table is missing." }, { status: 500 });
  }
}
