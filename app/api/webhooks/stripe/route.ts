import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDbConnection } from "@/lib/db";
import { sendPaidPlanWelcomeEmail } from "@/lib/send-welcome-emails";
import { conversationLimitForPlan, type BillingPlan } from "@/lib/plans";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" })
  : null;

function planFromCheckoutMetadata(
  raw: string | undefined | null
): Exclude<BillingPlan, "free"> {
  const p = (raw || "growth").toLowerCase();
  if (p === "pro") return "pro";
  if (p === "agency") return "agency";
  return "growth";
}

export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe or STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId) {
          console.error("Stripe checkout.session.completed: no userId in metadata");
          break;
        }
        const checkoutPlan = planFromCheckoutMetadata(session.metadata?.checkoutPlan);
        const convLimit = conversationLimitForPlan(checkoutPlan);

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const customerId: string | null =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as { id?: string } | null)?.id ?? null;

        const conn = await getDbConnection();
        await conn.execute(
          `UPDATE users SET plan = ?, conversation_limit = ?,
           limit_reached_period = NULL, last_upgrade_reminder_at = NULL,
           stripe_customer_id = ?, stripe_subscription_id = ?
           WHERE id = ?`,
          [checkoutPlan, convLimit, customerId, subscriptionId ?? null, userId]
        );
        const [rows] = await conn.execute(
          "SELECT email, name FROM users WHERE id = ?",
          [userId]
        );
        await conn.end();
        const user = (rows as { email: string; name: string | null }[])[0];
        if (user?.email) {
          sendPaidPlanWelcomeEmail(user.email, user.name ?? null, checkoutPlan).catch((e) =>
            console.error("Paid welcome email after Stripe:", e)
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.userId;
        if (!userId) {
          const conn = await getDbConnection();
          const [rows] = await conn.execute(
            "SELECT id FROM users WHERE stripe_subscription_id = ?",
            [subscription.id]
          );
          await conn.end();
          userId = (rows as { id: string }[])[0]?.id;
        }
        if (userId) {
          const conn = await getDbConnection();
          await conn.execute(
            `UPDATE users SET plan = 'free', conversation_limit = 100,
             stripe_subscription_id = NULL WHERE id = ?`,
            [userId]
          );
          await conn.end();
        }
        break;
      }

      case "invoice.paid": {
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
