/**
 * In-memory rate limiter by key (e.g. IP). Use for auth and heavy APIs.
 * For multi-instance deploy, replace with Redis or similar.
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute

function getKey(prefix: string, req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}`;
}

function cleanup(): void {
  const now = Date.now();
  Array.from(store.entries()).forEach(([k, v]) => {
    if (v.resetAt < now) store.delete(k);
  });
}

export function checkRateLimit(
  req: Request,
  prefix: string,
  maxPerWindow: number
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  if (store.size > 10000) cleanup();
  const key = getKey(prefix, req);
  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (entry.resetAt < now) {
    entry.count = 1;
    entry.resetAt = now + WINDOW_MS;
    return { ok: true };
  }
  entry.count++;
  if (entry.count <= maxPerWindow) return { ok: true };
  return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

export const LIMITS = {
  auth: 15,      // login/signup per IP per minute
  chat: 60,     // chat messages per IP per minute
  scrape: 5,    // scrape per IP per minute
  upload: 10,   // knowledge upload per IP per minute
  convMessages: 60, // hydrate thread per IP per minute (widget refresh)
} as const;
