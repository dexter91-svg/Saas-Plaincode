import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDbConnection } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filterUserId = req.nextUrl.searchParams.get("userId") ?? null;
  const isUnattributed = filterUserId === "__unattributed__";
  const where = filterUserId ? (isUnattributed ? "WHERE a.user_id IS NULL" : "WHERE a.user_id = ?") : "";
  const whereP = filterUserId ? (isUnattributed ? "WHERE user_id IS NULL" : "WHERE user_id = ?") : "";
  const params: string[] = filterUserId && !isUnattributed ? [filterUserId] : [];

  try {
    const conn = await getDbConnection();

    // All customers who have usage (for the dropdown) — attributed rows only
    const [customerRows] = await conn.execute(`
      SELECT
        u.id   AS id,
        u.email AS email,
        SUM(a.cost_usd) AS cost
      FROM ai_usage a
      JOIN users u ON u.id = a.user_id
      GROUP BY a.user_id, u.email, u.id
      ORDER BY cost DESC
    `);

    // Totals by period (optionally filtered)
    const [totalsRows] = await conn.execute(`
      SELECT
        SUM(cost_usd)                                                           AS costAllTime,
        SUM(IF(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY), cost_usd, 0))   AS cost30d,
        SUM(IF(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY),  cost_usd, 0))   AS cost7d,
        SUM(IF(created_at >= CURDATE(),                         cost_usd, 0))   AS costToday,
        SUM(input_tokens + output_tokens)                                       AS tokensAllTime,
        SUM(IF(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY), input_tokens + output_tokens, 0)) AS tokens30d,
        SUM(IF(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY),  input_tokens + output_tokens, 0)) AS tokens7d,
        SUM(IF(created_at >= CURDATE(),                         input_tokens + output_tokens, 0)) AS tokensToday
      FROM ai_usage ${whereP}
    `, params);
    const totals = (totalsRows as Record<string, number | null>[])[0];

    // Cost by provider/model
    const [byModelRows] = await conn.execute(`
      SELECT a.provider, a.model, SUM(a.cost_usd) AS cost, SUM(a.input_tokens + a.output_tokens) AS tokens, COUNT(*) AS calls
      FROM ai_usage a ${where}
      GROUP BY a.provider, a.model
      ORDER BY cost DESC
    `, params);

    // Top customers by cost (only shown when no filter)
    let topUsersRows: unknown[] = [];
    if (!filterUserId) {
      const [rows] = await conn.execute(`
        SELECT
          u.email AS email,
          SUM(a.cost_usd) AS cost,
          SUM(a.input_tokens + a.output_tokens) AS tokens,
          COUNT(*) AS calls
        FROM ai_usage a
        JOIN users u ON u.id = a.user_id
        GROUP BY a.user_id, u.email
        ORDER BY cost DESC
        LIMIT 20
      `);
      topUsersRows = rows as unknown[];
    }

    // Daily cost trend (last 30 days)
    const [dailyRows] = await conn.execute(`
      SELECT DATE(created_at) AS date, SUM(cost_usd) AS cost
      FROM ai_usage
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
        ${filterUserId ? (isUnattributed ? "AND user_id IS NULL" : "AND user_id = ?") : ""}
      GROUP BY DATE(created_at)
    `, params);

    const dailyMap = new Map<string, number>();
    for (const row of dailyRows as { date: string; cost: number }[]) {
      dailyMap.set(new Date(row.date).toISOString().slice(0, 10), Number(row.cost));
    }
    const costDaily30d = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, cost: dailyMap.get(key) ?? 0 };
    });

    await conn.end();

    return NextResponse.json({
      customers: customerRows,
      totals: {
        costAllTime:   Number(totals?.costAllTime  ?? 0),
        cost30d:       Number(totals?.cost30d      ?? 0),
        cost7d:        Number(totals?.cost7d       ?? 0),
        costToday:     Number(totals?.costToday    ?? 0),
        tokensAllTime: Number(totals?.tokensAllTime ?? 0),
        tokens30d:     Number(totals?.tokens30d    ?? 0),
        tokens7d:      Number(totals?.tokens7d     ?? 0),
        tokensToday:   Number(totals?.tokensToday  ?? 0),
      },
      byModel: byModelRows,
      topUsers: topUsersRows,
      costTrend: { daily30d: costDaily30d },
    });
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? "";
    if (msg.includes("doesn't exist") || msg.includes("Table") || msg.includes("ai_usage")) {
      return NextResponse.json({
        customers: [],
        totals: { costAllTime: 0, cost30d: 0, cost7d: 0, costToday: 0, tokensAllTime: 0, tokens30d: 0, tokens7d: 0, tokensToday: 0 },
        byModel: [],
        topUsers: [],
        costTrend: { daily30d: [] },
        _notice: "Run migrations to enable usage tracking.",
      });
    }
    console.error("GET /api/admin/usage error:", err);
    return NextResponse.json({ error: "Failed to load usage data" }, { status: 500 });
  }
}
