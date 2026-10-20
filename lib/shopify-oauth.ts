/**
 * Shopify OAuth (custom-distribution app): install redirect, HMAC verification,
 * and authorization-code exchange. Scopes are read-only — this app only reads
 * store data for the chatbot's knowledge base.
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";

export const SHOPIFY_SCOPES = "read_products,read_content";
const STATE_MAX_AGE_SECONDS = 600; // 10 minutes

function getSecret(): string {
  const raw = process.env.AUTH_SECRET;
  const secret = typeof raw === "string" ? raw.trim() : undefined;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 16) {
      throw new Error("AUTH_SECRET is required in production and must be at least 16 characters.");
    }
    return secret;
  }
  return secret || "default-secret-min-32-chars-for-dev-only";
}

function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (url) return (url.startsWith("http") ? url : `https://${url}`).replace(/\/$/, "");
  return "http://localhost:3000";
}

export function getRedirectUri(): string {
  return `${getAppUrl()}/api/shopify/callback`;
}

/** "my-store.myshopify.com" only — rejects anything else to avoid open-redirect/SSRF via a crafted shop param. */
export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

interface OAuthStatePayload {
  nonce: string;
  userId: string;
  shop: string;
}

export function createOAuthState(userId: string, shop: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  return jwt.sign({ nonce, userId, shop } as OAuthStatePayload, getSecret(), {
    expiresIn: STATE_MAX_AGE_SECONDS,
  });
}

export function verifyOAuthState(token: string): OAuthStatePayload | null {
  try {
    return jwt.verify(token, getSecret()) as OAuthStatePayload;
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(shop: string, state: string): string {
  const clientId = process.env.SHOPIFY_API_KEY;
  if (!clientId) throw new Error("SHOPIFY_API_KEY is not set");
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES,
    redirect_uri: getRedirectUri(),
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verifies the `hmac` query param Shopify sends on the OAuth callback.
 * Per Shopify's documented algorithm: remove hmac/signature, sort remaining
 * params by key, join as key=value pairs with "&", HMAC-SHA256 (hex) with the
 * app's client secret, and compare.
 */
export function verifyOAuthHmac(searchParams: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const pairs: string[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");

  const computed = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(hmac, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken: string; scope: string } | null> {
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; scope?: string };
  if (!data.access_token) return null;
  return { accessToken: data.access_token, scope: data.scope || "" };
}
