import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID } from "crypto";
import { getDbConnection } from "@/lib/db";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

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
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const conn = await getDbConnection();
    let userId: string | null = null;
    try {
      const [rows] = await conn.execute("SELECT id FROM users WHERE email = ?", [email]);
      const u = (rows as { id: string }[])[0];
      userId = u?.id ?? null;
    } finally {
      await conn.end();
    }

    // Same response whether or not the user exists (avoid account enumeration)
    const generic = { ok: true, message: "If an account exists for that email, we sent a reset link." };
    if (!userId) {
      return NextResponse.json(generic);
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const id = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    const conn2 = await getDbConnection();
    try {
      await conn2.execute("DELETE FROM password_resets WHERE user_id = ?", [userId]);
      await conn2.execute(
        "INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
        [id, userId, tokenHash, expires]
      );
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "ER_NO_SUCH_TABLE") {
        return NextResponse.json(
          { error: "Password reset is not available until the database is migrated (password_resets table)." },
          { status: 503 }
        );
      }
      throw e;
    } finally {
      await conn2.end();
    }

    await sendPasswordResetEmail(email, rawToken);
    return NextResponse.json(generic);
  } catch (err) {
    console.error("forgot-password:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
