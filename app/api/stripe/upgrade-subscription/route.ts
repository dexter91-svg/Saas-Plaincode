import { NextResponse } from "next/server";
import { createToken, getAuthFromCookie, setAuthCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { conversationLimitForPlan, normalizePlanParam } from "@/lib/plans";
import Stripe from "stripe";

/**
 * In-app upgrade: Growth → Pro by updating the existing Stripe subscription (no second subscription).
 */
export async function POST(req: Request) {
  const rl = checkRateLimit(req, "stripe-upgrade", 10);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const auth = await getAuthFromCookie();
  if (!auth?.userId || !auth.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const p = typeof body?.targetPlan === "string" ? body.targetPlan.toLowerCase() : "";
    if (p !== "pro") {
      return NextResponse.json({ error: "Invalid target plan" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const proPriceId = process.env.STRIPE_PRICE_ID_PRO_MONTHLY;
  if (!secretKey || !proPriceId) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const conn = await getDbConnection();
  try {
    const [userRows] = await conn.execute(
      "SELECT plan, stripe_subscription_id AS stripeSubscriptionId FROM users WHERE id = ?",
      [auth.userId]
    );
    const user = (userRows as { plan?: string; stripeSubscriptionId?: string | null }[])[0];
    const plan = normalizePlanParam(user?.plan);
    const subId = user?.stripeSubscriptionId?.trim() || null;

    if (plan !== "growth") {
      return NextResponse.json(
        { error: "Upgrade from subscription is only available on Growth.", useCheckout: true },
        { status: 400 }
      );
    }

    if (!subId) {
      return NextResponse.json(
        { error: "No active subscription found. Use checkout instead.", useCheckout: true },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });

    const sub = await stripe.subscriptions.retrieve(subId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ error: "Could not read subscription items." }, { status: 500 });
    }

    await stripe.subscriptions.update(subId, {
      items: [{ id: itemId, price: proPriceId }],
      proration_behavior: "create_prorations",
      metadata: {
        ...sub.metadata,
        userId: auth.userId,
        checkoutPlan: "pro",
      },
    });

    const convLimit = conversationLimitForPlan("pro");
    await conn.execute(
      `UPDATE users SET plan = 'pro', conversation_limit = ?,
       limit_reached_period = NULL, last_upgrade_reminder_at = NULL
       WHERE id = ?`,
      [convLimit, auth.userId]
    );

    const token = createToken({ userId: auth.userId, email: auth.email, plan: "pro" });
    await setAuthCookie(token);

    return NextResponse.json({ ok: true, plan: "pro" });
  } catch (err) {
    console.error("Stripe upgrade-subscription error:", err);
    return NextResponse.json(
      { error: "Could not upgrade subscription. Try again or use checkout." },
      { status: 500 }
    );
  } finally {
    await conn.end();
  }
}
