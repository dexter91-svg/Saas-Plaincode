import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getDbConnection } from "@/lib/db";

const ADMIN_EMAIL = "admin@plainbot.com";
const ADMIN_PASSWORD = "123456";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conn = await getDbConnection();

  // Ensure is_admin column exists (migration may not have run yet)
  const [cols] = await conn.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'"
  );
  if ((cols as unknown[]).length === 0) {
    await conn.execute("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0");
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const [rows] = await conn.execute("SELECT id FROM users WHERE email = ?", [ADMIN_EMAIL]);

  if ((rows as { id: string }[]).length > 0) {
    await conn.execute("UPDATE users SET password_hash = ?, is_admin = 1 WHERE email = ?", [hash, ADMIN_EMAIL]);
    await conn.end();
    return NextResponse.json({ ok: true, action: "updated", email: ADMIN_EMAIL });
  }

  await conn.execute(
    "INSERT INTO users (id, email, password_hash, plan, is_admin) VALUES (?, ?, ?, 'free', 1)",
    [randomUUID(), ADMIN_EMAIL, hash]
  );
  await conn.end();
  return NextResponse.json({ ok: true, action: "created", email: ADMIN_EMAIL });
}
