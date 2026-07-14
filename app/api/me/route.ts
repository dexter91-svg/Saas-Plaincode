import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET() {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const conn = await getDbConnection();
    const [rows] = await conn.execute("SELECT plan FROM users WHERE id = ?", [auth.userId]);
    await conn.end();
    const dbPlan = (rows as { plan?: string }[])[0]?.plan;
    return NextResponse.json({
      userId: auth.userId,
      email: auth.email,
      plan: typeof dbPlan === "string" && dbPlan ? dbPlan : auth.plan || "free",
    });
  } catch {
    return NextResponse.json({
      userId: auth.userId,
      email: auth.email,
      plan: auth.plan || "free",
    });
  }
}
