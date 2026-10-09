import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conn = await getDbConnection();
  const log: string[] = [];

  try {
    // crawl_logs table
    const [crawlTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crawl_logs'"
    );
    if ((crawlTables as unknown[]).length === 0) {
      await conn.execute(`
        CREATE TABLE crawl_logs (
          id              CHAR(36) PRIMARY KEY,
          user_id         CHAR(36) NULL,
          url             VARCHAR(500) NOT NULL,
          status          ENUM('success', 'failed', 'timeout', 'captcha') NOT NULL,
          store_type      VARCHAR(50) NULL,
          products_found  INT NOT NULL DEFAULT 0,
          duration_ms     INT NULL,
          error_message   TEXT NULL,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_crawl_logs_user    (user_id),
          INDEX idx_crawl_logs_created (created_at),
          INDEX idx_crawl_logs_status  (status),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      log.push("Created crawl_logs table");
    } else {
      log.push("crawl_logs already exists");
    }

    // is_admin column on users
    const [isAdminCols] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'"
    );
    if ((isAdminCols as unknown[]).length === 0) {
      await conn.execute("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0");
      log.push("Added users.is_admin");
    } else {
      log.push("users.is_admin already exists");
    }

    // ai_usage table
    const [aiTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_usage'"
    );
    if ((aiTables as unknown[]).length === 0) {
      await conn.execute(`
        CREATE TABLE ai_usage (
          id            CHAR(36)      NOT NULL DEFAULT (UUID()),
          user_id       CHAR(36)      NULL,
          provider      VARCHAR(32)   NOT NULL,
          model         VARCHAR(64)   NOT NULL,
          input_tokens  INT           NOT NULL DEFAULT 0,
          output_tokens INT           NOT NULL DEFAULT 0,
          cost_usd      DECIMAL(10,8) NOT NULL DEFAULT 0,
          created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_ai_usage_user_id    (user_id),
          INDEX idx_ai_usage_created_at (created_at),
          INDEX idx_ai_usage_provider   (provider)
        )
      `);
      log.push("Created ai_usage table");
    } else {
      // Ensure user_id is nullable
      const [nullableCols] = await conn.execute(
        "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_usage' AND COLUMN_NAME = 'user_id'"
      );
      const isNullable = (nullableCols as { IS_NULLABLE: string }[])[0]?.IS_NULLABLE === "YES";
      if (!isNullable) {
        await conn.execute("ALTER TABLE ai_usage MODIFY COLUMN user_id CHAR(36) NULL");
        log.push("Made ai_usage.user_id nullable");
      } else {
        log.push("ai_usage already exists and user_id is nullable");
      }
    }

    await conn.end();
    return NextResponse.json({ ok: true, log });
  } catch (err: unknown) {
    await conn.end();
    return NextResponse.json({ error: (err as { message?: string })?.message ?? "Unknown error", log }, { status: 500 });
  }
}
