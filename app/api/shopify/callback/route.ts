import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDbConnection } from "@/lib/db";
import {
  exchangeCodeForToken,
  isValidShopDomain,
  verifyOAuthHmac,
  verifyOAuthState,
} from "@/lib/shopify-oauth";

export const runtime = "nodejs";

function errorRedirect(req: NextRequest, reason: string) {
  return NextResponse.redirect(new URL(`/create-bot?shopify=error&reason=${reason}`, req.url));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const shop = (params.get("shop") || "").trim().toLowerCase();
  const code = params.get("code") || "";
  const state = params.get("state") || "";

  if (!isValidShopDomain(shop) || !code || !state) {
    return errorRedirect(req, "missing_params");
  }
  if (!verifyOAuthHmac(params)) {
    return errorRedirect(req, "invalid_hmac");
  }
  const statePayload = verifyOAuthState(state);
  if (!statePayload || statePayload.shop !== shop) {
    return errorRedirect(req, "invalid_state");
  }

  const exchanged = await exchangeCodeForToken(shop, code);
  if (!exchanged) {
    return errorRedirect(req, "token_exchange_failed");
  }

  try {
    const conn = await getDbConnection();
    await conn.execute(
      `INSERT INTO shopify_connections (id, user_id, shop_domain, access_token, scope)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), access_token = VALUES(access_token), scope = VALUES(scope)`,
      [randomUUID(), statePayload.userId, shop, exchanged.accessToken, exchanged.scope]
    );
    await conn.end();
  } catch (err) {
    console.error("[shopify callback] Failed to store connection:", err);
    return errorRedirect(req, "save_failed");
  }

  return NextResponse.redirect(new URL(`/create-bot?shopify=connected&shop=${shop}`, req.url));
}
