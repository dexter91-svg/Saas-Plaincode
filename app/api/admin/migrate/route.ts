import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conn = await getDbConnection();
  const log: string[] = [];

  async function hasColumn(table: string, column: string) {
    const [rows] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [table, column]
    );
    return (rows as unknown[]).length > 0;
  }

  async function tableExists(table: string) {
    const [rows] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [table]
    );
    return (rows as unknown[]).length > 0;
  }

  try {
    // users columns
    if (!(await hasColumn("users", "forward_email"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN forward_email VARCHAR(255) DEFAULT NULL");
      log.push("Added users.forward_email");
    }
    if (!(await hasColumn("users", "limit_reached_period"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN limit_reached_period CHAR(7) DEFAULT NULL");
      log.push("Added users.limit_reached_period");
    }
    if (!(await hasColumn("users", "last_upgrade_reminder_at"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN last_upgrade_reminder_at TIMESTAMP NULL DEFAULT NULL");
      log.push("Added users.last_upgrade_reminder_at");
    }
    if (!(await hasColumn("users", "stripe_customer_id"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL");
      log.push("Added users.stripe_customer_id");
    }
    if (!(await hasColumn("users", "stripe_subscription_id"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255) DEFAULT NULL");
      log.push("Added users.stripe_subscription_id");
    }
    if (!(await hasColumn("users", "notify_sound_new_conversation"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN notify_sound_new_conversation TINYINT(1) NOT NULL DEFAULT 1");
      log.push("Added users.notify_sound_new_conversation");
    }
    if (!(await hasColumn("users", "notify_sound_ongoing_message"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN notify_sound_ongoing_message TINYINT(1) NOT NULL DEFAULT 0");
      log.push("Added users.notify_sound_ongoing_message");
    }
    if (!(await hasColumn("users", "complimentary_credits"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN complimentary_credits INT DEFAULT 0");
      log.push("Added users.complimentary_credits");
    }
    if (!(await hasColumn("users", "escalation_alert_email"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN escalation_alert_email VARCHAR(255) NULL DEFAULT NULL");
      log.push("Added users.escalation_alert_email");
    }
    if (!(await hasColumn("users", "escalation_alert_minutes"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN escalation_alert_minutes INT NULL DEFAULT NULL");
      log.push("Added users.escalation_alert_minutes");
    }
    if (!(await hasColumn("users", "resend_api_key"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN resend_api_key VARCHAR(255) NULL DEFAULT NULL");
      log.push("Added users.resend_api_key");
    }
    if (!(await hasColumn("users", "is_admin"))) {
      await conn.execute("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0");
      log.push("Added users.is_admin");
    }

    // plan enum
    const [planCols] = await conn.execute(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'plan'"
    );
    const planType = String((planCols as { COLUMN_TYPE?: string }[])[0]?.COLUMN_TYPE ?? "").toLowerCase();
    if (planType && planType.indexOf("growth") === -1) {
      await conn.execute("ALTER TABLE users MODIFY COLUMN plan ENUM('free','pro','custom','growth','agency') DEFAULT 'free'");
      log.push("Extended users.plan enum");
    }
    const [convNull] = await conn.execute(
      "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'conversation_limit'"
    );
    if ((convNull as { IS_NULLABLE?: string }[])[0]?.IS_NULLABLE !== "YES") {
      await conn.execute("ALTER TABLE users MODIFY COLUMN conversation_limit INT NULL DEFAULT 100");
      log.push("Made users.conversation_limit nullable");
    }

    // chatbots columns
    for (const col of [
      ["guard_rails", "TEXT DEFAULT NULL"],
      ["uploaded_docs_text", "LONGTEXT DEFAULT NULL"],
      ["language", "VARCHAR(20) DEFAULT 'en'"],
      ["widget_accent_color", "VARCHAR(7) DEFAULT NULL"],
      ["widget_logo_mime", "VARCHAR(50) DEFAULT NULL"],
      ["widget_logo_base64", "LONGTEXT DEFAULT NULL"],
      ["refund_enabled", "TINYINT(1) NOT NULL DEFAULT 0"],
      ["refund_max_amount", "DECIMAL(10,2) NULL DEFAULT NULL"],
      ["refund_window_days", "INT NULL DEFAULT NULL"],
    ] as [string, string][]) {
      if (!(await hasColumn("chatbots", col[0]))) {
        await conn.execute(`ALTER TABLE chatbots ADD COLUMN ${col[0]} ${col[1]}`);
        log.push(`Added chatbots.${col[0]}`);
      }
    }

    // conversations columns
    if (!(await hasColumn("conversations", "handoff_mode"))) {
      await conn.execute("ALTER TABLE conversations ADD COLUMN handoff_mode VARCHAR(16) NOT NULL DEFAULT 'ai'");
      log.push("Added conversations.handoff_mode");
    }
    if (!(await hasColumn("conversations", "assigned_agent_id"))) {
      await conn.execute("ALTER TABLE conversations ADD COLUMN assigned_agent_id CHAR(36) NULL");
      log.push("Added conversations.assigned_agent_id");
    }
    if (!(await hasColumn("conversations", "requests_human"))) {
      await conn.execute("ALTER TABLE conversations ADD COLUMN requests_human TINYINT(1) NOT NULL DEFAULT 0");
      await conn.execute("ALTER TABLE conversations ADD INDEX idx_conversations_requests_human (requests_human)");
      log.push("Added conversations.requests_human");
    }

    // chat_messages.role enum
    const [roleCols] = await conn.execute(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'role'"
    );
    const roleType = String((roleCols as { COLUMN_TYPE?: string }[])[0]?.COLUMN_TYPE ?? "").toLowerCase();
    if (roleType && roleType.indexOf("agent") === -1) {
      await conn.execute("ALTER TABLE chat_messages MODIFY COLUMN role ENUM('user', 'assistant', 'agent') NOT NULL");
      log.push("Extended chat_messages.role enum");
    }

    // forwarded_conversations columns
    for (const col of [
      ["reply_text", "TEXT DEFAULT NULL"],
      ["replied_at", "TIMESTAMP NULL DEFAULT NULL"],
      ["customer_email", "VARCHAR(255) DEFAULT NULL"],
      ["reminder_6h_sent_at", "TIMESTAMP NULL DEFAULT NULL"],
      ["reminder_12h_sent_at", "TIMESTAMP NULL DEFAULT NULL"],
      ["reminder_24h_sent_at", "TIMESTAMP NULL DEFAULT NULL"],
      ["order_ref", "VARCHAR(255) DEFAULT NULL"],
      ["acknowledged_at", "TIMESTAMP NULL DEFAULT NULL"],
      ["merchant_alerted_at", "TIMESTAMP NULL DEFAULT NULL"],
      ["customer_message", "TEXT NULL DEFAULT NULL"],
      ["priority", "VARCHAR(16) NOT NULL DEFAULT 'normal'"],
    ] as [string, string][]) {
      if (await tableExists("forwarded_conversations") && !(await hasColumn("forwarded_conversations", col[0]))) {
        await conn.execute(`ALTER TABLE forwarded_conversations ADD COLUMN ${col[0]} ${col[1]}`);
        log.push(`Added forwarded_conversations.${col[0]}`);
      }
    }

    // tables
    if (!(await tableExists("forwarded_conversations"))) {
      await conn.execute(`
        CREATE TABLE forwarded_conversations (
          id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, conversation_id CHAR(36) NOT NULL,
          customer VARCHAR(255) DEFAULT NULL, customer_email VARCHAR(255) DEFAULT NULL,
          preview TEXT DEFAULT NULL, forwarded_as ENUM('email','ticket') NOT NULL DEFAULT 'email',
          ticket_ref VARCHAR(100) DEFAULT NULL, reply_text TEXT DEFAULT NULL,
          replied_at TIMESTAMP NULL DEFAULT NULL, order_ref VARCHAR(255) DEFAULT NULL,
          acknowledged_at TIMESTAMP NULL DEFAULT NULL, merchant_alerted_at TIMESTAMP NULL DEFAULT NULL,
          customer_message TEXT NULL DEFAULT NULL, priority VARCHAR(16) NOT NULL DEFAULT 'normal',
          reminder_6h_sent_at TIMESTAMP NULL DEFAULT NULL, reminder_12h_sent_at TIMESTAMP NULL DEFAULT NULL,
          reminder_24h_sent_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_forwarded_user (user_id), INDEX idx_forwarded_created (created_at),
          INDEX idx_forwarded_conversation (conversation_id)
        )
      `);
      log.push("Created forwarded_conversations");
    }
    if (!(await tableExists("tickets"))) {
      await conn.execute(`
        CREATE TABLE tickets (
          id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, conversation_id CHAR(36) DEFAULT NULL,
          ticket_ref VARCHAR(50) NOT NULL,
          type ENUM('ai_resolved','forwarded_email','forwarded_human','database_check','escalated','other') NOT NULL,
          customer VARCHAR(255) DEFAULT NULL, query_preview TEXT DEFAULT NULL, outcome TEXT DEFAULT NULL,
          status ENUM('open','resolved','in_progress') DEFAULT 'open',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_ticket_ref (ticket_ref), INDEX idx_tickets_user (user_id),
          INDEX idx_tickets_conversation (conversation_id), INDEX idx_tickets_created (created_at)
        )
      `);
      log.push("Created tickets");
    }
    if (!(await tableExists("chatbot_documents"))) {
      await conn.execute(`
        CREATE TABLE chatbot_documents (
          id CHAR(36) PRIMARY KEY, chatbot_id CHAR(36) NOT NULL,
          file_name VARCHAR(500) NOT NULL, content LONGTEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
          INDEX idx_chatbot_documents_bot (chatbot_id)
        )
      `);
      log.push("Created chatbot_documents");
    }
    if (!(await tableExists("chatbot_knowledge_chunks"))) {
      await conn.execute(`
        CREATE TABLE chatbot_knowledge_chunks (
          id CHAR(36) PRIMARY KEY, chatbot_id CHAR(36) NOT NULL,
          source_type ENUM('website','document','catalog') NOT NULL,
          source_label VARCHAR(500) DEFAULT NULL, chunk_index INT NOT NULL DEFAULT 0,
          content TEXT NOT NULL, embedding_json LONGTEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
          INDEX idx_knowledge_bot (chatbot_id)
        ) ENGINE=InnoDB
      `);
      log.push("Created chatbot_knowledge_chunks");
    }
    if (!(await tableExists("password_resets"))) {
      await conn.execute(`
        CREATE TABLE password_resets (
          id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
          token_hash VARCHAR(64) NOT NULL, expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_password_resets_user (user_id), INDEX idx_password_resets_hash (token_hash),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
      log.push("Created password_resets");
    }
    if (!(await tableExists("conversation_usage"))) {
      await conn.execute(`
        CREATE TABLE conversation_usage (
          id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, period_month CHAR(7) NOT NULL,
          count_used INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_usage_user_period (user_id, period_month),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_usage_user (user_id)
        )
      `);
      log.push("Created conversation_usage");
    }
    if (!(await tableExists("user_external_endpoints"))) {
      await conn.execute(`
        CREATE TABLE user_external_endpoints (
          id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, chatbot_id CHAR(36) DEFAULT NULL,
          name VARCHAR(100) NOT NULL, base_url VARCHAR(500) NOT NULL,
          auth_type ENUM('none','bearer','api_key_header','basic') DEFAULT 'none',
          auth_value VARCHAR(500) DEFAULT NULL, method_default VARCHAR(10) DEFAULT 'GET',
          is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_uep_user (user_id), INDEX idx_uep_chatbot (chatbot_id)
        )
      `);
      log.push("Created user_external_endpoints");
    }
    if (!(await tableExists("crawl_logs"))) {
      await conn.execute(`
        CREATE TABLE crawl_logs (
          id CHAR(36) PRIMARY KEY, user_id CHAR(36) NULL, url VARCHAR(500) NOT NULL,
          status ENUM('success','failed','timeout','captcha') NOT NULL,
          store_type VARCHAR(50) NULL, products_found INT NOT NULL DEFAULT 0,
          duration_ms INT NULL, error_message TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_crawl_logs_user (user_id), INDEX idx_crawl_logs_created (created_at),
          INDEX idx_crawl_logs_status (status),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      log.push("Created crawl_logs");
    }
    if (!(await tableExists("ai_usage"))) {
      await conn.execute(`
        CREATE TABLE ai_usage (
          id CHAR(36) NOT NULL DEFAULT (UUID()), user_id CHAR(36) NULL,
          provider VARCHAR(32) NOT NULL, model VARCHAR(64) NOT NULL,
          input_tokens INT NOT NULL DEFAULT 0, output_tokens INT NOT NULL DEFAULT 0,
          cost_usd DECIMAL(10,8) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id), INDEX idx_ai_usage_user_id (user_id),
          INDEX idx_ai_usage_created_at (created_at), INDEX idx_ai_usage_provider (provider)
        )
      `);
      log.push("Created ai_usage");
    } else {
      const [aiNullable] = await conn.execute(
        "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_usage' AND COLUMN_NAME = 'user_id'"
      );
      if ((aiNullable as { IS_NULLABLE?: string }[])[0]?.IS_NULLABLE !== "YES") {
        await conn.execute("ALTER TABLE ai_usage MODIFY COLUMN user_id CHAR(36) NULL");
        log.push("Made ai_usage.user_id nullable");
      }
    }

    // chatbot_documents backfill
    try {
      const [legacyBots] = await conn.execute(
        "SELECT id, uploaded_docs_text AS txt FROM chatbots WHERE uploaded_docs_text IS NOT NULL AND TRIM(uploaded_docs_text) != ''"
      );
      for (const row of legacyBots as { id: string; txt: string }[]) {
        const [existing] = await conn.execute("SELECT id FROM chatbot_documents WHERE chatbot_id = ? LIMIT 1", [row.id]);
        if ((existing as unknown[]).length > 0) continue;
        await conn.execute(
          "INSERT INTO chatbot_documents (id, chatbot_id, file_name, content) VALUES (?, ?, ?, ?)",
          [randomUUID(), row.id, "Previous upload (migrated)", row.txt]
        );
      }
    } catch { /* skip */ }

    await conn.end();
    return NextResponse.json({ ok: true, log });
  } catch (err: unknown) {
    await conn.end();
    return NextResponse.json({ error: (err as { message?: string })?.message ?? "Unknown error", log }, { status: 500 });
  }
}
