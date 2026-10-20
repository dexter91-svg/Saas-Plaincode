import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { buildAuthorizeUrl, createOAuthState, isValidShopDomain } from "@/lib/shopify-oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth?.userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const shop = (req.nextUrl.searchParams.get("shop") || "").trim().toLowerCase();
  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(
      new URL("/create-bot?shopify=error&reason=invalid_shop", req.url)
    );
  }

  const state = createOAuthState(auth.userId, shop);
  return NextResponse.redirect(buildAuthorizeUrl(shop, state));
}
