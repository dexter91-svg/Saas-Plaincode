import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET() {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const conn = await getDbConnection();

    const [signupRows] = await conn.execute(
      `SELECT
         SUM(created_at >= CURDATE()) AS today,
         SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS last7d,
         SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS last30d,
         COUNT(*) AS allTime
       FROM users`
    );
    const signups = (signupRows as { today: number; last7d: number; last30d: number; allTime: number }[])[0];

    const [activeBotsRows] = await conn.execute(
      "SELECT COUNT(*) AS count FROM chatbots WHERE is_active = 1"
    );
    const activeChatbots = (activeBotsRows as { count: number }[])[0]?.count ?? 0;

    const [activatedUsersRows] = await conn.execute(
      "SELECT COUNT(DISTINCT user_id) AS count FROM chatbots WHERE is_active = 1"
    );
    const activatedUsers = (activatedUsersRows as { count: number }[])[0]?.count ?? 0;

    const [totalChurnedRows] = await conn.execute(
      "SELECT COUNT(*) AS count FROM users WHERE plan = 'free' AND stripe_customer_id IS NOT NULL"
    );
    const totalChurned = (totalChurnedRows as { count: number }[])[0]?.count ?? 0;

    const [planRows] = await conn.execute(
      "SELECT plan, COUNT(*) AS count FROM users WHERE plan IN ('growth','pro','agency') GROUP BY plan"
    );
    const payingByPlan = { growth: 0, pro: 0, agency: 0 };
    for (const row of planRows as { plan: "growth" | "pro" | "agency"; count: number }[]) {
      payingByPlan[row.plan] = row.count;
    }
    const totalPaying = payingByPlan.growth + payingByPlan.pro + payingByPlan.agency;

    // Best-effort churn signal: had a Stripe customer (was paying) but is back on
    // the free plan, and the account row changed this month (the downgrade).
    const [churnRows] = await conn.execute(
      `SELECT COUNT(*) AS count FROM users
       WHERE plan = 'free'
         AND stripe_customer_id IS NOT NULL
         AND updated_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`
    );
    const churnedThisMonth = (churnRows as { count: number }[])[0]?.count ?? 0;

    // Signup trend data, one query per granularity, for the range filter on the
    // dashboard (today -> hourly, 7d/30d -> daily, all-time -> monthly).
    const [hourlyRows] = await conn.execute(
      `SELECT HOUR(created_at) AS hour, COUNT(*) AS count
       FROM users WHERE created_at >= CURDATE() GROUP BY HOUR(created_at)`
    );
    const hourlyMap = new Map<number, number>();
    for (const row of hourlyRows as { hour: number; count: number }[]) {
      hourlyMap.set(row.hour, row.count);
    }
    const hourlyToday = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyMap.get(hour) ?? 0,
    }));

    const [dailyRows] = await conn.execute(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY DATE(created_at)`
    );
    const dailyMap = new Map<string, number>();
    for (const row of dailyRows as { date: string; count: number }[]) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      dailyMap.set(key, row.count);
    }
    const daily30d = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: dailyMap.get(key) ?? 0 };
    });

    const [monthlyRows] = await conn.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM users GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC`
    );
    const monthly = (monthlyRows as { month: string; count: number }[]).map((r) => ({
      month: r.month,
      count: r.count,
    }));

    // Free vs paying composition of signups, per range filter (for the donut).
    const [mix7dRows] = await conn.execute(
      `SELECT SUM(plan = 'free') AS free, SUM(plan != 'free') AS paying
       FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    const [mix30dRows] = await conn.execute(
      `SELECT SUM(plan = 'free') AS free, SUM(plan != 'free') AS paying
       FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const mix7d = (mix7dRows as { free: number; paying: number }[])[0];
    const mix30d = (mix30dRows as { free: number; paying: number }[])[0];
    const customerMix = {
      "7d": { free: mix7d?.free ?? 0, paying: mix7d?.paying ?? 0 },
      "30d": { free: mix30d?.free ?? 0, paying: mix30d?.paying ?? 0 },
      all: { free: Math.max(0, (signups?.allTime ?? 0) - totalPaying), paying: totalPaying },
    };

    // Churn trend - same shape as the signups trend above (daily for the last 30 days,
    // monthly for all-time), but keyed off updated_at (when the downgrade happened)
    // for users matching the same best-effort churn signal used for churnedThisMonth.
    const CHURN_CONDITION = "plan = 'free' AND stripe_customer_id IS NOT NULL";
    const [churnDailyRows] = await conn.execute(
      `SELECT DATE(updated_at) AS date, COUNT(*) AS count
       FROM users WHERE ${CHURN_CONDITION} AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY DATE(updated_at)`
    );
    const churnDailyMap = new Map<string, number>();
    for (const row of churnDailyRows as { date: string; count: number }[]) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      churnDailyMap.set(key, row.count);
    }
    const churnDaily30d = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: churnDailyMap.get(key) ?? 0 };
    });

    const [churnMonthlyRows] = await conn.execute(
      `SELECT DATE_FORMAT(updated_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM users WHERE ${CHURN_CONDITION}
       GROUP BY DATE_FORMAT(updated_at, '%Y-%m') ORDER BY month ASC`
    );
    const churnMonthly = (churnMonthlyRows as { month: string; count: number }[]).map((r) => ({
      month: r.month,
      count: r.count,
    }));

    // Conversion rate + avg days to convert (signup → paid).
    const conversionRate =
      (signups?.allTime ?? 0) > 0
        ? Math.round((totalPaying / (signups?.allTime ?? 1)) * 100)
        : 0;

    const [avgDaysRows] = await conn.execute(
      `SELECT ROUND(AVG(DATEDIFF(updated_at, created_at))) AS avg_days
       FROM users WHERE plan != 'free' AND updated_at > created_at`
    );
    const avgDaysToConvert = (avgDaysRows as { avg_days: number | null }[])[0]?.avg_days ?? null;

    // Churn rate = churned this month / paying customers at start of month (approx: totalPaying + churnedThisMonth)
    const churnBase = totalPaying + churnedThisMonth;
    const churnRate = churnBase > 0 ? Math.round((churnedThisMonth / churnBase) * 100) : 0;

    const [recentChurnRows] = await conn.execute(
      `SELECT email, updated_at AS date FROM users
       WHERE plan = 'free' AND stripe_customer_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 10`
    );
    const recentlyChurned = (recentChurnRows as { email: string; date: string }[]).map((r) => ({
      email: r.email,
      date: new Date(r.date).toISOString().slice(0, 10),
    }));

    // Activation trend — one row per day/month a new chatbot was created (proxy for
    // when a user first activated). COUNT(DISTINCT user_id) so multi-bot users count once.
    const [activDailyRows] = await conn.execute(
      `SELECT DATE(created_at) AS date, COUNT(DISTINCT user_id) AS count
       FROM chatbots
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY DATE(created_at)`
    );
    const activDailyMap = new Map<string, number>();
    for (const row of activDailyRows as { date: string; count: number }[]) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      activDailyMap.set(key, row.count);
    }
    const activDaily30d = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: activDailyMap.get(key) ?? 0 };
    });

    const [activMonthlyRows] = await conn.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(DISTINCT user_id) AS count
       FROM chatbots GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC`
    );
    const activMonthly = (activMonthlyRows as { month: string; count: number }[]).map((r) => ({
      month: r.month,
      count: r.count,
    }));

    await conn.end();

    return NextResponse.json({
      conversionRate,
      avgDaysToConvert,
      churnRate,
      recentlyChurned,
      activatedUsers,
      totalChurned,
      signups: {
        today: signups?.today ?? 0,
        last7d: signups?.last7d ?? 0,
        last30d: signups?.last30d ?? 0,
        allTime: signups?.allTime ?? 0,
      },
      activeChatbots,
      payingByPlan,
      totalPaying,
      churnedThisMonth,
      signupsTrend: {
        hourlyToday,
        daily30d,
        monthly,
      },
      customerMix,
      churnTrend: {
        daily30d: churnDaily30d,
        monthly: churnMonthly,
      },
      activationsTrend: {
        daily30d: activDaily30d,
        monthly: activMonthly,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/analytics/overview error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
