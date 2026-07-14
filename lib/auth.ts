import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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

const COOKIE_NAME = "auth-token";
const MAX_AGE = 60 * 60 * 24; // 24 hours

export interface TokenPayload {
  userId: string;
  email: string;
  plan: string;
  exp?: number;
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload },
    getSecret(),
    { expiresIn: MAX_AGE }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function createForwardToken(conversationId: string): string {
  return jwt.sign(
    { conversationId },
    getSecret(),
    { expiresIn: "30d" }
  );
}

export function verifyForwardToken(token: string): { conversationId: string } | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as { conversationId: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAuthFromCookie(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token) as TokenPayload | null;
}
