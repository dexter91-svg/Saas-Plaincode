import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { sendPaidPlanWelcomeEmail } from "@/lib/send-welcome-emails";
import { normalizePlanParam, type BillingPlan } from "@/lib/plans";

export async function POST() {
  const auth = await getAuthFromCookie();
  if (!auth?.userId || !auth?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plan = normalizePlanParam(auth.plan) as BillingPlan;
  if (plan !== "growth" && plan !== "pro" && plan !== "agency") {
    return NextResponse.json({ error: "Paid plan required" }, { status: 400 });
  }
  const result = await sendPaidPlanWelcomeEmail(auth.email, auth.email.split("@")[0], plan);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
