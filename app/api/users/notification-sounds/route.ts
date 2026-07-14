import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { getAuthFromCookie } from "@/lib/auth";

async function hasNotifyColumn(conn: Awaited<ReturnType<typeof getDbConnection>>): Promise<boolean> {
  try {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'notify_sound_new_conversation'
       LIMIT 1`
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

const DEFAULT_ENABLED = true;

export async function GET() {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await getDbConnection();
    try {
      if (!(await hasNotifyColumn(conn))) {
        await conn.end();
        return NextResponse.json({ enabled: DEFAULT_ENABLED });
      }
      const [rows] = await conn.execute(
        `SELECT notify_sound_new_conversation AS enabled FROM users WHERE id = ?`,
        [auth.userId]
      );
      await conn.end();
      const r = (rows as { enabled: number }[])[0];
      return NextResponse.json({ enabled: r ? Boolean(r.enabled) : DEFAULT_ENABLED });
    } catch {
      await conn.end();
      return NextResponse.json({ enabled: DEFAULT_ENABLED });
    }
  } catch (err) {
    console.error("Notification sounds GET:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthFromCookie();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 });
    }
    const enabled = body.enabled;

    const conn = await getDbConnection();
    if (!(await hasNotifyColumn(conn))) {
      await conn.end();
      return NextResponse.json(
        { error: "Run database migration: npm run db:migrate" },
        { status: 503 }
      );
    }

    await conn.execute(`UPDATE users SET notify_sound_new_conversation = ? WHERE id = ?`, [
      enabled ? 1 : 0,
      auth.userId,
    ]);
    await conn.end();

    return NextResponse.json({ ok: true, enabled });
  } catch (err) {
    console.error("Notification sounds PATCH:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
