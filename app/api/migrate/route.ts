import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";

export const runtime = "nodejs";

async function hasColumn(conn: Awaited<ReturnType<typeof getDbConnection>>, table: string, column: string): Promise<boolean> {
  const [[db]] = await conn.execute("SELECT DATABASE() AS db") as any;
  const schema = db?.db || process.env.DB_NAME || "ecommerce_support";
  const [rows] = await conn.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [schema, table, column]
  ) as any;
  return Array.isArray(rows) && rows.length > 0;
}

async function hasTable(conn: Awaited<ReturnType<typeof getDbConnection>>, table: string): Promise<boolean> {
  const [[db]] = await conn.execute("SELECT DATABASE() AS db") as any;
  const schema = db?.db || process.env.DB_NAME || "ecommerce_support";
  const [rows] = await conn.execute(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [schema, table]
  ) as any;
  return Array.isArray(rows) && rows.length > 0;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-migrate-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await getDbConnection();
  const applied: string[] = [];

  try {
    // escalation alert columns
    if (!(await hasColumn(conn, "users", "escalation_alert_email"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN escalation_alert_email VARCHAR(255) NULL DEFAULT NULL");
      applied.push("users.escalation_alert_email");
    }
    if (!(await hasColumn(conn, "users", "escalation_alert_minutes"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN escalation_alert_minutes INT NULL DEFAULT NULL");
      applied.push("users.escalation_alert_minutes");
    }

    // refund columns on chatbots
    if (!(await hasColumn(conn, "chatbots", "refund_enabled"))) {
      await conn.execute("ALTER TABLE chatbots ADD COLUMN refund_enabled TINYINT(1) NOT NULL DEFAULT 0");
      applied.push("chatbots.refund_enabled");
    }
    if (!(await hasColumn(conn, "chatbots", "refund_max_amount"))) {
      await conn.execute("ALTER TABLE chatbots ADD COLUMN refund_max_amount DECIMAL(10,2) NULL DEFAULT NULL");
      applied.push("chatbots.refund_max_amount");
    }
    if (!(await hasColumn(conn, "chatbots", "refund_window_days"))) {
      await conn.execute("ALTER TABLE chatbots ADD COLUMN refund_window_days INT NULL DEFAULT NULL");
      applied.push("chatbots.refund_window_days");
    }

    // priority column on forwarded_conversations
    if (!(await hasColumn(conn, "forwarded_conversations", "priority"))) {
      await conn.execute("ALTER TABLE forwarded_conversations ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'normal'");
      applied.push("forwarded_conversations.priority");
    }

    // password_resets table
    if (!(await hasTable(conn, "password_resets"))) {
      await conn.execute(`
        CREATE TABLE password_resets (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          token_hash VARCHAR(64) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_token_hash (token_hash)
        )
      `);
      applied.push("table:password_resets");
    }

    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    console.error("[migrate]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    await conn.end();
  }
}
