import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbConnection } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/auth";
import { randomUUID } from "crypto";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { sendFreeWelcomeEmail } from "@/lib/send-welcome-emails";
import { conversationLimitForPlan, normalizePlanParam, type BillingPlan } from "@/lib/plans";

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
    const name = (body.name as string)?.trim() || null;
    const planParam = (body.plan as string) || "free";
    const plan: BillingPlan = normalizePlanParam(planParam);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const conn = await getDbConnection();

    const [existing] = await conn.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    const rows = existing as { id: string }[];

    if (rows.length > 0) {
      await conn.end();
      return NextResponse.json(
        { error: "Email already registered. Log in instead." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const convLimit = conversationLimitForPlan(plan);

    await conn.execute(
      "INSERT INTO users (id, email, password_hash, name, plan, conversation_limit) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, email, passwordHash, name, plan, convLimit]
    );

    await conn.end();

    const token = createToken({
      userId,
      email,
      plan,
    });

    await setAuthCookie(token);

    if (plan === "free") {
      sendFreeWelcomeEmail(email, name).catch((e) => console.error("Free welcome email error:", e));
    }

    const redirectToPayment = plan === "growth" || plan === "pro" || plan === "agency";

    return NextResponse.json({
      ok: true,
      user: { id: userId, email, name, plan },
      redirectToPayment,
      paymentPlan: redirectToPayment ? plan : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Signup error:", message, err);
    if (message.includes("ECONNREFUSED") || message.includes("connect")) {
      return NextResponse.json(
        { error: "Database is unreachable. Check your database is running and Vercel env vars (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) are set." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Signup failed. Try again." },
      { status: 500 }
    );
  }
}
