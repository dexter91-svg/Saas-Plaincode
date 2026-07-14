/**
 * Billing plans: store caps and monthly conversation limits.
 * Free: 1 store, 100 conv · Growth: 3 stores, 1k conv · Pro: 5 stores, 3k conv · Agency: unlimited
 */
export type BillingPlan = "free" | "growth" | "pro" | "agency";

/** Client display: treat remaining >= this as unlimited (Agency). */
export const UNLIMITED_CONVERSATIONS_DISPLAY = 999_999_999;

export function normalizePlanParam(raw: string | undefined | null): BillingPlan {
  const p = (raw || "free").toLowerCase();
  if (p === "growth") return "growth";
  if (p === "pro" || p === "business") return "pro";
  if (p === "agency" || p === "custom") return "agency";
  return "free";
}

/** null = unlimited conversations (Agency) */
export function conversationLimitForPlan(plan: string | undefined | null): number | null {
  const n = normalizePlanParam(plan || "free");
  if (n === "free") return 100;
  if (n === "growth") return 1000;
  if (n === "pro") return 3000;
  return null;
}

/** 80% of monthly cap — dashboard near-limit upgrade nudges (Free → Growth, Growth → Pro). */
export function nearLimitConversationThreshold(limit: number): number {
  return Math.max(0, Math.floor(limit * 0.8));
}

export function storeLimitForPlan(plan: string | undefined | null): number | null {
  const n = normalizePlanParam(plan || "free");
  if (n === "free") return 1;
  if (n === "growth") return 3;
  if (n === "pro") return 5;
  return null;
}

export function canAddStore(plan: string | undefined | null, currentCount: number): boolean {
  const cap = storeLimitForPlan(plan);
  if (cap === null) return true;
  return currentCount < cap;
}

/** Paid self-serve Stripe tiers (not Agency onboarding). */
export function isStripeCheckoutPlan(plan: string): boolean {
  return plan === "growth" || plan === "pro" || plan === "agency";
}

export function planHasPaidConversationTier(plan: string | undefined | null): boolean {
  const n = normalizePlanParam(plan || "free");
  return n === "growth" || n === "pro" || n === "agency";
}
