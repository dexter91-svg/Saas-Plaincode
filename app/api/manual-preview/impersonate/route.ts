import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { createToken } from "@/lib/auth";

const DEV_ONLY = process.env.NODE_ENV !== "production";
const COOKIE_NAME = "auth-token";
const MAX_AGE = 60 * 60 * 24;

export async function GET(req: NextRequest) {
  if (!DEV_ONLY) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.redirect(new URL("/manual-preview", req.url));
  }
  try {
    const conn = await getDbConnection();
    const [rows] = await conn.execute(
      "SELECT id, email, plan FROM users WHERE id = ?",
      [userId]
    );
    await conn.end();
    const user = (rows as { id: string; email: string; plan: string }[])[0];
    if (!user) {
      return NextResponse.redirect(new URL("/manual-preview", req.url));
    }
    const token = createToken({
      userId: user.id,
      email: user.email,
      plan: user.plan || "free",
    });
    const url = new URL("/dashboard", req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Impersonate error:", err);
    return NextResponse.redirect(new URL("/manual-preview", req.url));
  }
}
