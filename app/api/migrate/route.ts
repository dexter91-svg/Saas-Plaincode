import { NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";

// ONE-TIME migration route — delete after use
export async function GET() {
  try {
    const conn = await getDbConnection();
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS crawl_logs (
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
    await conn.end();
    return NextResponse.json({ ok: true, message: "crawl_logs table created (or already existed)." });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
