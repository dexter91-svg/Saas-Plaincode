import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { getDbConnection } from "@/lib/db";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "auth", LIMITS.auth);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const conn = await getDbConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT pr.id AS prId, pr.user_id AS userId, pr.expires_at AS expiresAt, pr.used_at AS usedAt
         FROM password_resets pr
         WHERE pr.token_hash = ?`,
        [tokenHash]
      );
      const row = (rows as { prId: string; userId: string; expiresAt: Date; usedAt: Date | null }[])[0];
      if (!row || row.usedAt) {
        return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
      }
      const exp = row.expiresAt ? new Date(row.expiresAt).getTime() : 0;
      if (exp < Date.now()) {
        return NextResponse.json({ error: "This reset link has expired. Request a new one." }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await conn.beginTransaction();
      await conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, row.userId]);
      await conn.execute("UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?", [row.prId]);
      await conn.commit();
      return NextResponse.json({ ok: true });
    } catch (e: unknown) {
      await conn.rollback().catch(() => {});
      const code = (e as { code?: string })?.code;
      if (code === "ER_NO_SUCH_TABLE") {
        return NextResponse.json({ error: "Password reset is not configured on the server." }, { status: 503 });
      }
      throw e;
    } finally {
      await conn.end();
    }
  } catch (err) {
    console.error("reset-password:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
