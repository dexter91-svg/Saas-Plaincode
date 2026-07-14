import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const storeType = (body.storeType as string)?.toLowerCase();

    if (!storeType || !["shopify", "woocommerce", "custom"].includes(storeType)) {
      return NextResponse.json(
        { error: "Invalid store type. Use shopify, woocommerce, or custom" },
        { status: 400 }
      );
    }

    const conn = await getDbConnection();
    await conn.execute(
      "UPDATE users SET store_type = ? WHERE id = ?",
      [storeType, auth.userId]
    );
    await conn.end();

    return NextResponse.json({ ok: true, storeType });
  } catch (err) {
    console.error("Store type update error:", err);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      "SELECT store_type FROM users WHERE id = ?",
      [auth.userId]
    );
    await conn.end();

    const users = rows as { store_type: string | null }[];
    const storeType = users[0]?.store_type ?? null;

    return NextResponse.json({ storeType });
  } catch (err) {
    console.error("Store type fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
