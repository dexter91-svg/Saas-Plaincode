import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatbotId = req.nextUrl.searchParams.get("chatbotId")?.trim() || null;

    const conn = await getDbConnection();
    const userId = auth.userId;

    const fwdFrom = chatbotId
      ? "forwarded_conversations f INNER JOIN conversations conv ON conv.id = f.conversation_id"
      : "forwarded_conversations f";
    const fwdUserClause = chatbotId ? "f.user_id = ? AND conv.chatbot_id = ?" : "f.user_id = ?";
    const fwdParamsHead = chatbotId ? [userId, chatbotId] : [userId];

    // Week boundaries (UTC): this week and last week
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfThisWeek.setUTCHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setUTCDate(startOfLastWeek.getUTCDate() - 7);
    const thisWeekStr = startOfThisWeek.toISOString().slice(0, 19).replace("T", " ");
    const lastWeekStr = startOfLastWeek.toISOString().slice(0, 19).replace("T", " ");

    const [totalRows] = await conn.execute(
      `SELECT COUNT(*) AS total FROM ${fwdFrom} WHERE ${fwdUserClause} AND f.created_at >= ?`,
      [...fwdParamsHead, thisWeekStr]
    );
    const totalForwarded = Number((totalRows as { total: number }[])[0]?.total ?? 0);

    const [lastWeekRows] = await conn.execute(
      `SELECT COUNT(*) AS total FROM ${fwdFrom} WHERE ${fwdUserClause} AND f.created_at >= ? AND f.created_at < ?`,
      [...fwdParamsHead, lastWeekStr, thisWeekStr]
    );
    const totalLastWeek = Number((lastWeekRows as { total: number }[])[0]?.total ?? 0);
    let percentChange = 0;
    if (totalLastWeek > 0) {
      percentChange = Math.round(((totalForwarded - totalLastWeek) / totalLastWeek) * 100);
    } else if (totalForwarded > 0) {
      percentChange = 100;
    }

    const [emailRows] = await conn.execute(
      `SELECT COUNT(*) AS c FROM ${fwdFrom} WHERE ${fwdUserClause} AND f.created_at >= ? AND f.forwarded_as = 'email'`,
      [...fwdParamsHead, thisWeekStr]
    );
    const sentToEmail = Number((emailRows as { c: number }[])[0]?.c ?? 0);
    const liveAgentTransfers = totalForwarded - sentToEmail;
    const emailPct = totalForwarded > 0 ? Math.round((sentToEmail / totalForwarded) * 1000) / 10 : 0;
    const livePct = totalForwarded > 0 ? Math.round((liveAgentTransfers / totalForwarded) * 1000) / 10 : 0;

    let typeCounts: { type: string; c: number }[] = [];
    if (chatbotId) {
      const [typeRows] = await conn.execute(
        `SELECT t.type, COUNT(*) AS c FROM tickets t
         INNER JOIN conversations c ON c.id = t.conversation_id
         WHERE t.user_id = ? AND c.chatbot_id = ? AND t.created_at >= ? AND t.type IN ('forwarded_email', 'forwarded_human', 'escalated', 'other')
         GROUP BY t.type`,
        [userId, chatbotId, thisWeekStr]
      );
      typeCounts = (typeRows as { type: string; c: number }[]) || [];
    } else {
      const [typeRows] = await conn.execute(
        `SELECT type, COUNT(*) AS c FROM tickets
         WHERE user_id = ? AND created_at >= ? AND type IN ('forwarded_email', 'forwarded_human', 'escalated', 'other')
         GROUP BY type`,
        [userId, thisWeekStr]
      );
      typeCounts = (typeRows as { type: string; c: number }[]) || [];
    }

    const totalTickets = typeCounts.reduce((s, r) => s + r.c, 0);
    const distribution = [
      { label: "Refund request", type: "forwarded_email", pct: 0 },
      { label: "Frustrated customer", type: "forwarded_human", pct: 0 },
      { label: "Complex technical issue", type: "escalated", pct: 0 },
      { label: "Out of scope inquiry", type: "other", pct: 0 },
    ].map((d) => {
      const row = typeCounts.find((r) => r.type === d.type);
      const c = row ? row.c : 0;
      const pct = totalTickets > 0 ? Math.round((c / totalTickets) * 100) : 0;
      return { ...d, count: c, pct };
    });
    if (totalTickets === 0 && totalForwarded > 0) {
      distribution[0].pct = emailPct;
      distribution[0].label = "Sent to email";
      distribution[1].pct = livePct;
      distribution[1].label = "Live agent transfer";
      distribution[2].pct = 0;
      distribution[3].pct = 0;
    }

    const [hourRows] = await conn.execute(
      `SELECT HOUR(f.created_at) AS hour, COUNT(*) AS c FROM ${fwdFrom}
       WHERE ${fwdUserClause} AND f.created_at >= ?
       GROUP BY HOUR(f.created_at) ORDER BY c DESC LIMIT 1`,
      [...fwdParamsHead, thisWeekStr]
    );
    const peakRow = (hourRows as { hour: number; c: number }[])[0];
    let peakTime = "—";
    if (peakRow && peakRow.c > 0) {
      const h = peakRow.hour;
      const h2 = Math.min(h + 2, 23);
      const fmt = (hour: number) => {
        const h12 = hour % 12 || 12;
        const ampm = hour < 12 ? "AM" : "PM";
        return `${h12}:00 ${ampm}`;
      };
      peakTime = `${fmt(h)} – ${fmt(h2)}`;
    }

    let avgResponseMinutes: number | null = null;
    try {
      const [avgRows] = await conn.execute(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, f.created_at, f.replied_at)) AS avg_min
         FROM ${fwdFrom}
         WHERE ${fwdUserClause} AND f.created_at >= ? AND f.replied_at IS NOT NULL`,
        [...fwdParamsHead, thisWeekStr]
      );
      const avgVal = (avgRows as { avg_min: number | null }[])[0]?.avg_min;
      if (avgVal != null && !Number.isNaN(avgVal)) avgResponseMinutes = Math.round(avgVal * 10) / 10;
    } catch {
      // replied_at column may not exist
    }

    await conn.end();

    return NextResponse.json({
      totalForwarded,
      percentChange,
      sentToEmail,
      liveAgentTransfers,
      emailPct,
      livePct,
      distribution,
      peakTime,
      avgResponseMinutes,
    });
  } catch (err) {
    console.error("Analytics forwarded error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
