import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED = [
  "/dashboard",
  "/create-bot",
  "/bot-personality",
  "/bot-preview",
  "/knowledge",
  "/test-chatbot",
  "/integration",
  "/demo-website",
  "/analytics",
  "/training-data",
  "/handoff-rules",
  "/tickets",
  "/conversations",
  "/forwarded-conversations",
  "/onboarding",
  "/settings",
  "/admin",
  "/signup/payment",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // In production, redirect HTTP to HTTPS (if host is plainbot.io or your domain)
  const isProd = process.env.NODE_ENV === "production";
  const proto = req.headers.get("x-forwarded-proto");
  if (isProd && proto === "http") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  const hasToken = req.nextUrl.searchParams.has("token") || req.nextUrl.search.includes("token=");
  const isForwardedView = pathname.startsWith("/forwarded-conversations");
  const isPublicBypass = hasToken && isForwardedView;

  console.log(`[Middleware Check] path: ${pathname}, hasToken: ${hasToken}, isForwardedView: ${isForwardedView}, isPublicBypass: ${isPublicBypass}`);

  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p)) && !isPublicBypass;
  let res: NextResponse;
  if (!needsAuth) {
    res = NextResponse.next();
  } else {
    // Mock auth only in development
    const mockAuth = isProd ? null : req.cookies.get("mock-auth")?.value;
    if (mockAuth === "1") {
      res = NextResponse.next();
    } else {
      const token = req.cookies.get("auth-token")?.value;
      if (token) {
        const secretStr = (process.env.AUTH_SECRET || "default-secret-min-32-chars-for-dev-only").trim();
        const secret = new TextEncoder().encode(secretStr);
        try {
          await jwtVerify(token, secret);
          res = NextResponse.next();
        } catch {
          const url = req.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("from", pathname);
          res = NextResponse.redirect(url);
        }
      } else {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", pathname);
        res = NextResponse.redirect(url);
      }
    }
  }

  // Security headers on all responses
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * Ensures security headers and HTTPS redirect apply site-wide.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

