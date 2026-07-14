import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { conversationLimitForPlan, normalizePlanParam } from "@/lib/plans";

const DEV_ONLY = process.env.NODE_ENV !== "production";

function currentUsageMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  if (!DEV_ONLY) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const conn = await getDbConnection();
    const periodMonth = currentUsageMonth();

    type UserBase = {
      id: string;
      email: string;
      name: string | null;
      plan: string;
      conversationLimit: number | null;
      createdAt: string;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
    };

    let users: UserBase[];
    let hasStripeCols = false;
    try {
      const [userRows] = await conn.execute(
        `SELECT id, email, name, plan, conversation_limit AS conversationLimit, created_at AS createdAt,
         stripe_customer_id AS stripeCustomerId, stripe_subscription_id AS stripeSubscriptionId
         FROM users ORDER BY created_at DESC`
      );
      users = userRows as UserBase[];
      hasStripeCols = true;
    } catch {
      const [userRows] = await conn.execute(
        "SELECT id, email, name, plan, conversation_limit AS conversationLimit, created_at AS createdAt FROM users ORDER BY created_at DESC"
      );
      users = (userRows as Omit<UserBase, "stripeCustomerId" | "stripeSubscriptionId">[]).map((u) => ({
        ...u,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      }));
    }

    const [usageRows] = await conn.execute(
      "SELECT user_id AS userId, count_used AS countUsed FROM conversation_usage WHERE period_month = ?",
      [periodMonth]
    );
    const usageByUser = (usageRows as { userId: string; countUsed: number }[]).reduce(
      (acc, r) => {
        acc[r.userId] = r.countUsed;
        return acc;
      },
      {} as Record<string, number>
    );

    type ConvStats = { open: number; resolved: number; forwarded: number; total: number };
    let statsByUser: Record<string, ConvStats> = {};
    try {
      const [statRows] = await conn.execute(
        `SELECT cb.user_id AS userId,
          SUM(CASE WHEN c.status = 'open' THEN 1 ELSE 0 END) AS openCount,
          SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) AS resolvedCount,
          SUM(CASE WHEN c.status = 'forwarded' THEN 1 ELSE 0 END) AS forwardedCount,
          COUNT(*) AS totalCount
         FROM conversations c
         INNER JOIN chatbots cb ON cb.id = c.chatbot_id
         GROUP BY cb.user_id`
      );
      type StatRow = {
        userId: string;
        openCount: unknown;
        resolvedCount: unknown;
        forwardedCount: unknown;
        totalCount: unknown;
      };
      statsByUser = (statRows as StatRow[]).reduce<Record<string, ConvStats>>((acc, row) => {
        acc[row.userId] = {
          open: Number(row.openCount) || 0,
          resolved: Number(row.resolvedCount) || 0,
          forwarded: Number(row.forwardedCount) || 0,
          total: Number(row.totalCount) || 0,
        };
        return acc;
      }, {});
    } catch {
      /* conversations / chatbots missing */
    }

    type ConvRow = {
      id: string;
      chatbotId: string;
      chatbotName: string | null;
      userId: string;
      status: string;
      customerEmail: string | null;
      customerName: string | null;
      messageCount: number;
      createdAt: string;
      updatedAt: string;
    };

    let recentFlat: ConvRow[] = [];
    try {
      const [convRows] = await conn.execute(
        `SELECT c.id, c.chatbot_id AS chatbotId, c.status, c.customer_email AS customerEmail,
          c.customer_name AS customerName, c.created_at AS createdAt, c.updated_at AS updatedAt,
          cb.name AS chatbotName, cb.user_id AS userId,
          COALESCE(mc.cnt, 0) AS messageCount
         FROM conversations c
         INNER JOIN chatbots cb ON cb.id = c.chatbot_id
         LEFT JOIN (
           SELECT conversation_id, COUNT(*) AS cnt FROM chat_messages GROUP BY conversation_id
         ) mc ON mc.conversation_id = c.id
         ORDER BY c.updated_at DESC
         LIMIT 400`
      );
      recentFlat = (convRows as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        chatbotId: row.chatbotId as string,
        chatbotName: (row.chatbotName as string) || null,
        userId: row.userId as string,
        status: row.status as string,
        customerEmail: (row.customerEmail as string) || null,
        customerName: (row.customerName as string) || null,
        messageCount: Number(row.messageCount) || 0,
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
      }));
    } catch {
      /* schema mismatch */
    }

    const recentByUser: Record<string, ConvRow[]> = {};
    for (const row of recentFlat) {
      if (!recentByUser[row.userId]) recentByUser[row.userId] = [];
      if (recentByUser[row.userId].length < 25) recentByUser[row.userId].push(row);
    }
    const [chatbotRows] = await conn.execute(
      "SELECT id, user_id AS userId, name, website_url AS websiteUrl FROM chatbots ORDER BY created_at DESC"
    );
    const chatbotsByUser = (chatbotRows as { id: string; userId: string; name: string; websiteUrl: string }[]).reduce(
      (acc, c) => {
        if (!acc[c.userId]) acc[c.userId] = [];
        acc[c.userId].push({ id: c.id, name: c.name, websiteUrl: c.websiteUrl });
        return acc;
      },
      {} as Record<string, { id: string; name: string; websiteUrl: string }[]>
    );
    let endpointsByUser: Record<string, { id: string; name: string; baseUrl: string; authType: string }[]> = {};
    try {
      const [epRows] = await conn.execute(
        "SELECT id, user_id AS userId, name, base_url AS baseUrl, auth_type AS authType FROM user_external_endpoints WHERE is_active = 1"
      );
      endpointsByUser = (epRows as { id: string; userId: string; name: string; baseUrl: string; authType: string }[]).reduce(
        (acc, e) => {
          if (!acc[e.userId]) acc[e.userId] = [];
          acc[e.userId].push({ id: e.id, name: e.name, baseUrl: e.baseUrl, authType: e.authType });
          return acc;
        },
        {} as Record<string, { id: string; name: string; baseUrl: string; authType: string }[]>
      );
    } catch {
      /* user_external_endpoints table may not exist yet; run migration 003 */
    }
    await conn.end();

    const usersWithChatbots = users.map((u) => {
      const used = usageByUser[u.id] ?? 0;
      const limit = u.conversationLimit;
      const remaining =
        limit == null ? null : Math.max(0, limit - used);
      const norm = normalizePlanParam(u.plan);
      const hasPaidPlan = norm !== "free";
      const hasStripeSub = !!(hasStripeCols && u.stripeSubscriptionId);
      return {
        ...u,
        chatbots: chatbotsByUser[u.id] || [],
        endpoints: endpointsByUser[u.id] || [],
        usageThisMonth: used,
        conversationsRemaining: remaining,
        conversationStats: statsByUser[u.id] || {
          open: 0,
          resolved: 0,
          forwarded: 0,
          total: 0,
        },
        recentConversations: recentByUser[u.id] || [],
        isPayingCustomer: hasPaidPlan || hasStripeSub,
        hasStripeSubscription: hasStripeSub,
      };
    });

    return NextResponse.json({
      usagePeriodMonth: periodMonth,
      hasStripeColumns: hasStripeCols,
      users: usersWithChatbots,
    });
  } catch (err) {
    console.error("Manual preview users error:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!DEV_ONLY) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const raw = typeof body.plan === "string" ? body.plan.toLowerCase().trim() : "";
    const allowed = new Set(["free", "growth", "pro", "agency", "custom", "business"]);
    const plan = allowed.has(raw) ? normalizePlanParam(raw) : null;
    if (!userId || !plan) {
      return NextResponse.json(
        { error: "userId and plan (free|growth|pro|agency) required" },
        { status: 400 }
      );
    }
    const conn = await getDbConnection();
    const convLimit = conversationLimitForPlan(plan);
    await conn.execute("UPDATE users SET plan = ?, conversation_limit = ? WHERE id = ?", [
      plan,
      convLimit,
      userId,
    ]);
    await conn.end();
    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    console.error("Manual preview set plan error:", err);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}
