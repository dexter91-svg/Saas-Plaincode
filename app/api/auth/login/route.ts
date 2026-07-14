import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbConnection } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/auth";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "auth", LIMITS.auth);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const body = await req.json();
    const email = (body.email as string)?.trim()?.toLowerCase();
    const password = body.password as string;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const conn = await getDbConnection();

    const [rows] = await conn.execute(
      "SELECT id, email, password_hash, plan FROM users WHERE email = ?",
      [email]
    );

    await conn.end();

    const users = rows as { id: string; email: string; password_hash: string; plan: string }[];

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials. Sign up first to create an account." },
        { status: 401 }
      );
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      plan: user.plan || "free",
    });

    await setAuthCookie(token);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, plan: user.plan },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Login failed. Try again." },
      { status: 500 }
    );
  }
}
