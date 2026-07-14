/**
 * Run database migrations (adds missing columns/tables).
 * Loads .env.local from project root. Run: node scripts/migrate.js
 */
const fs = require("fs");
const path = require("path");

const localPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(localPath)) {
  fs.readFileSync(localPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    });
}

const mysql = require("mysql2/promise");
const { randomUUID } = require("crypto");

async function hasColumn(conn, table, column) {
  const [[db]] = await conn.execute("SELECT DATABASE() AS db");
  const schema = (db && (db).db) || process.env.DB_NAME || "ecommerce_support";
  const [rows] = await conn.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [schema, table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function run() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  let conn;
  if (url) {
    console.log("Connecting via MYSQL_URL...");
    conn = await mysql.createConnection(url);
  } else {
    const host = process.env.DB_HOST || "localhost";
    const port = parseInt(process.env.DB_PORT || "3306", 10);
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "ecommerce_support";
    console.log("Connecting to MySQL...");
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });
  }

  const [[dbRow]] = await conn.execute("SELECT DATABASE() AS db");
  const database = (dbRow && dbRow.db) || process.env.DB_NAME || "ecommerce_support";

  try {
    // 002: forward_email on users
    if (!(await hasColumn(conn, "users", "forward_email"))) {
      console.log("Adding users.forward_email...");
      await conn.execute("ALTER TABLE users ADD COLUMN forward_email VARCHAR(255) DEFAULT NULL");
      console.log("  OK");
    } else {
      console.log("users.forward_email already exists, skip.");
    }

    // 004: limit-reached tracking for upgrade emails
    if (!(await hasColumn(conn, "users", "limit_reached_period"))) {
      console.log("Adding users.limit_reached_period...");
      await conn.execute("ALTER TABLE users ADD COLUMN limit_reached_period CHAR(7) DEFAULT NULL COMMENT 'YYYY-MM when limit-reached email was sent'");
      console.log("  OK");
    } else {
      console.log("users.limit_reached_period already exists, skip.");
    }
    if (!(await hasColumn(conn, "users", "last_upgrade_reminder_at"))) {
      console.log("Adding users.last_upgrade_reminder_at...");
      await conn.execute("ALTER TABLE users ADD COLUMN last_upgrade_reminder_at TIMESTAMP NULL DEFAULT NULL");
      console.log("  OK");
    } else {
      console.log("users.last_upgrade_reminder_at already exists, skip.");
    }

    // 006: Stripe customer and subscription IDs (for Pro recurring billing)
    if (!(await hasColumn(conn, "users", "stripe_customer_id"))) {
      console.log("Adding users.stripe_customer_id...");
      await conn.execute("ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL");
      console.log("  OK");
    } else {
      console.log("users.stripe_customer_id already exists, skip.");
    }
    if (!(await hasColumn(conn, "users", "stripe_subscription_id"))) {
      console.log("Adding users.stripe_subscription_id...");
      await conn.execute("ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255) DEFAULT NULL");
      console.log("  OK");
    } else {
      console.log("users.stripe_subscription_id already exists, skip.");
    }

    // 005: plan enum add 'custom' (free | pro | custom)
    // Never narrow an enum that already lists growth/agency — that would invalidate existing rows ("Data truncated").
    const [planColRows] = await conn.execute(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'plan'",
      [database]
    );
    const planRow = Array.isArray(planColRows) && planColRows[0] ? planColRows[0] : null;
    const planType = planRow ? String(planRow.COLUMN_TYPE || planRow.column_type || "").toLowerCase() : "";
    const alreadyHasGrowthOrAgency =
      planType.indexOf("growth") !== -1 || planType.indexOf("agency") !== -1;
    if (planType && planType.indexOf("custom") === -1 && !alreadyHasGrowthOrAgency) {
      console.log("Adding 'custom' to users.plan enum...");
      await conn.execute("ALTER TABLE users MODIFY COLUMN plan ENUM('free','pro','custom') DEFAULT 'free'");
      console.log("  OK");
    } else if (alreadyHasGrowthOrAgency && planType.indexOf("custom") === -1) {
      console.log("users.plan already includes growth/agency — skip legacy 'add custom' step (would drop those values).");
    } else {
      console.log("users.plan already has 'custom', skip.");
    }

    // 007: plans growth/agency; migrate custom → agency; conversation_limit nullable
    const [planColRows2] = await conn.execute(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'plan'",
      [database]
    );
    const planRow2 = Array.isArray(planColRows2) && planColRows2[0] ? planColRows2[0] : null;
    const planType2 = planRow2 ? String(planRow2.COLUMN_TYPE || planRow2.column_type || "").toLowerCase() : "";
    if (planType2 && planType2.indexOf("growth") === -1) {
      console.log("Extending users.plan enum (growth, agency)...");
      await conn.execute(
        "ALTER TABLE users MODIFY COLUMN plan ENUM('free','pro','custom','growth','agency') DEFAULT 'free'"
      );
      console.log("  OK");
    }
    try {
      const [cr] = await conn.execute("SELECT COUNT(*) AS c FROM users WHERE plan = 'custom'");
      const n = (cr && cr[0] && cr[0].c) || 0;
      if (n > 0) {
        console.log("Migrating plan custom → agency...");
        await conn.execute("UPDATE users SET plan = 'agency' WHERE plan = 'custom'");
        console.log("  OK");
      }
    } catch (e) {
      console.log("  skip custom→agency:", e.message);
    }
    const [planColRows3] = await conn.execute(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'plan'",
      [database]
    );
    const planRow3 = Array.isArray(planColRows3) && planColRows3[0] ? planColRows3[0] : null;
    const planType3 = planRow3 ? String(planRow3.COLUMN_TYPE || planRow3.column_type || "").toLowerCase() : "";
    if (planType3 && planType3.indexOf("custom") !== -1) {
      console.log("Removing 'custom' from users.plan enum...");
      await conn.execute(
        "ALTER TABLE users MODIFY COLUMN plan ENUM('free','growth','pro','agency') DEFAULT 'free'"
      );
      console.log("  OK");
    }
    const [convNullRows] = await conn.execute(
      "SELECT IS_NULLABLE AS n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'conversation_limit'",
      [database]
    );
    const isNull = convNullRows && convNullRows[0] && String(convNullRows[0].n || convNullRows[0].IS_NULLABLE) === "YES";
    if (!isNull) {
      console.log("Making users.conversation_limit nullable (Agency = unlimited)...");
      await conn.execute("ALTER TABLE users MODIFY COLUMN conversation_limit INT NULL DEFAULT 100");
      console.log("  OK");
    }

    // 002: forwarded_conversations table
    const [tables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'forwarded_conversations'",
      [database]
    );
    if (!Array.isArray(tables) || tables.length === 0) {
      console.log("Creating forwarded_conversations...");
      await conn.execute(`
        CREATE TABLE forwarded_conversations (
          id              CHAR(36) PRIMARY KEY,
          user_id         CHAR(36) NOT NULL,
          conversation_id CHAR(36) NOT NULL,
          customer        VARCHAR(255) DEFAULT NULL,
          customer_email  VARCHAR(255) DEFAULT NULL,
          preview         TEXT DEFAULT NULL,
          forwarded_as    ENUM('email', 'ticket') NOT NULL DEFAULT 'email',
          ticket_ref      VARCHAR(100) DEFAULT NULL,
          reply_text      TEXT DEFAULT NULL,
          replied_at      TIMESTAMP NULL DEFAULT NULL,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_forwarded_user (user_id),
          INDEX idx_forwarded_created (created_at),
          INDEX idx_forwarded_conversation (conversation_id)
        )
      `);
      console.log("  OK");
    } else {
      if (!(await hasColumn(conn, "forwarded_conversations", "reply_text"))) {
        console.log("Adding forwarded_conversations.reply_text...");
        await conn.execute("ALTER TABLE forwarded_conversations ADD COLUMN reply_text TEXT DEFAULT NULL");
        console.log("  OK");
      }
      if (!(await hasColumn(conn, "forwarded_conversations", "replied_at"))) {
        console.log("Adding forwarded_conversations.replied_at...");
        await conn.execute("ALTER TABLE forwarded_conversations ADD COLUMN replied_at TIMESTAMP NULL DEFAULT NULL");
        console.log("  OK");
      }
      if (!(await hasColumn(conn, "forwarded_conversations", "customer_email"))) {
        console.log("Adding forwarded_conversations.customer_email...");
        await conn.execute("ALTER TABLE forwarded_conversations ADD COLUMN customer_email VARCHAR(255) DEFAULT NULL");
        console.log("  OK");
      }
      if (!(await hasColumn(conn, "forwarded_conversations", "reminder_6h_sent_at"))) {
        console.log("Adding forwarded_conversations.reminder_6h_sent_at...");
        await conn.execute(
          "ALTER TABLE forwarded_conversations ADD COLUMN reminder_6h_sent_at TIMESTAMP NULL DEFAULT NULL"
        );
        console.log("  OK");
      }
      if (!(await hasColumn(conn, "forwarded_conversations", "reminder_12h_sent_at"))) {
        console.log("Adding forwarded_conversations.reminder_12h_sent_at...");
        await conn.execute(
          "ALTER TABLE forwarded_conversations ADD COLUMN reminder_12h_sent_at TIMESTAMP NULL DEFAULT NULL"
        );
        console.log("  OK");
      }
      if (!(await hasColumn(conn, "forwarded_conversations", "reminder_24h_sent_at"))) {
        console.log("Adding forwarded_conversations.reminder_24h_sent_at...");
        await conn.execute(
          "ALTER TABLE forwarded_conversations ADD COLUMN reminder_24h_sent_at TIMESTAMP NULL DEFAULT NULL"
        );
        console.log("  OK");
      }
    }

    // tickets table (for all plans)
    const [ticketTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tickets'",
      [database]
    );
    if (!Array.isArray(ticketTables) || ticketTables.length === 0) {
      console.log("Creating tickets table...");
      await conn.execute(`
        CREATE TABLE tickets (
          id              CHAR(36) PRIMARY KEY,
          user_id         CHAR(36) NOT NULL,
          conversation_id CHAR(36) DEFAULT NULL,
          ticket_ref      VARCHAR(50) NOT NULL,
          type            ENUM('ai_resolved', 'forwarded_email', 'forwarded_human', 'database_check', 'escalated', 'other') NOT NULL,
          customer        VARCHAR(255) DEFAULT NULL,
          query_preview   TEXT DEFAULT NULL,
          outcome         TEXT DEFAULT NULL,
          status          ENUM('open', 'resolved', 'in_progress') DEFAULT 'open',
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_ticket_ref (ticket_ref),
          INDEX idx_tickets_user (user_id),
          INDEX idx_tickets_conversation (conversation_id),
          INDEX idx_tickets_created (created_at)
        )
      `);
      console.log("  OK");
    }

    // chatbots.guard_rails (AI guard rails per chatbot)
    if (!(await hasColumn(conn, "chatbots", "guard_rails"))) {
      console.log("Adding chatbots.guard_rails...");
      await conn.execute("ALTER TABLE chatbots ADD COLUMN guard_rails TEXT DEFAULT NULL");
      console.log("  OK");
    } else {
      console.log("chatbots.guard_rails already exists, skip.");
    }

    // chatbots.uploaded_docs_text (PDF/TXT content for chat context)
    if (!(await hasColumn(conn, "chatbots", "uploaded_docs_text"))) {
      console.log("Adding chatbots.uploaded_docs_text...");
      await conn.execute("ALTER TABLE chatbots ADD COLUMN uploaded_docs_text LONGTEXT DEFAULT NULL");
      console.log("  OK");
    } else {
      console.log("chatbots.uploaded_docs_text already exists, skip.");
    }

    // chatbot_documents (multiple PDF/TXT extracts per chatbot)
    const [docTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chatbot_documents'",
      [database]
    );
    if (!Array.isArray(docTables) || docTables.length === 0) {
      console.log("Creating chatbot_documents...");
      await conn.execute(`
        CREATE TABLE chatbot_documents (
          id              CHAR(36) PRIMARY KEY,
          chatbot_id      CHAR(36) NOT NULL,
          file_name       VARCHAR(500) NOT NULL,
          content         LONGTEXT NOT NULL,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
          INDEX idx_chatbot_documents_bot (chatbot_id)
        )
      `);
      console.log("  OK");
    } else {
      console.log("chatbot_documents already exists, skip.");
    }

    // One-time backfill: legacy uploaded_docs_text -> first document row
    try {
      const [legacyBots] = await conn.execute(
        "SELECT c.id AS id, c.uploaded_docs_text AS txt FROM chatbots c WHERE c.uploaded_docs_text IS NOT NULL AND TRIM(c.uploaded_docs_text) != ''"
      );
      const lb = Array.isArray(legacyBots) ? legacyBots : [];
      for (const row of lb) {
        const [existing] = await conn.execute("SELECT id FROM chatbot_documents WHERE chatbot_id = ? LIMIT 1", [
          row.id,
        ]);
        if (Array.isArray(existing) && existing.length > 0) continue;
        const id = randomUUID();
        const fn = "Previous upload (migrated)";
        await conn.execute(
          "INSERT INTO chatbot_documents (id, chatbot_id, file_name, content) VALUES (?, ?, ?, ?)",
          [id, row.id, fn, row.txt]
        );
      }
      if (lb.length > 0) {
        console.log("Backfilled chatbot_documents from uploaded_docs_text where needed.");
      }
    } catch (e) {
      console.log("chatbot_documents backfill skipped:", e.message || e);
    }

    // chatbot_knowledge_chunks (RAG: embeddings for website, docs, product catalog)
    const [knowledgeTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chatbot_knowledge_chunks'",
      [database]
    );
    if (!Array.isArray(knowledgeTables) || knowledgeTables.length === 0) {
      console.log("Creating chatbot_knowledge_chunks...");
      await conn.execute(`
        CREATE TABLE chatbot_knowledge_chunks (
          id              CHAR(36) PRIMARY KEY,
          chatbot_id      CHAR(36) NOT NULL,
          source_type     ENUM('website', 'document', 'catalog') NOT NULL,
          source_label    VARCHAR(500) DEFAULT NULL,
          chunk_index     INT NOT NULL DEFAULT 0,
          content         TEXT NOT NULL,
          embedding_json  LONGTEXT NOT NULL,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
          INDEX idx_knowledge_bot (chatbot_id)
        ) ENGINE=InnoDB
      `);
      console.log("  OK");
    } else {
      console.log("chatbot_knowledge_chunks already exists, skip.");
    }

    // password_resets (forgot-password flow)
    const [prTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'password_resets'",
      [database]
    );
    if (!Array.isArray(prTables) || prTables.length === 0) {
      console.log("Creating password_resets...");
      await conn.execute(`
        CREATE TABLE password_resets (
          id              CHAR(36) PRIMARY KEY,
          user_id         CHAR(36) NOT NULL,
          token_hash      VARCHAR(64) NOT NULL,
          expires_at      TIMESTAMP NOT NULL,
          used_at         TIMESTAMP NULL DEFAULT NULL,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_password_resets_user (user_id),
          INDEX idx_password_resets_hash (token_hash),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
      console.log("  OK");
    } else {
      console.log("password_resets already exists, skip.");
    }

    // chatbots.language (response language for the chatbot)
    if (!(await hasColumn(conn, "chatbots", "language"))) {
      console.log("Adding chatbots.language...");
      await conn.execute("ALTER TABLE chatbots ADD COLUMN language VARCHAR(20) DEFAULT 'en'");
      console.log("  OK");
    } else {
      console.log("chatbots.language already exists, skip.");
    }

    // chatbots.widget_accent_color (embed: floating button & send — any hex)
    if (!(await hasColumn(conn, "chatbots", "widget_accent_color"))) {
      console.log("Adding chatbots.widget_accent_color...");
      await conn.execute(
        "ALTER TABLE chatbots ADD COLUMN widget_accent_color VARCHAR(7) DEFAULT NULL"
      );
      console.log("  OK");
    } else {
      console.log("chatbots.widget_accent_color already exists, skip.");
    }

    // chatbots.widget_logo_* (paid widgets: optional logo in header; stored as base64)
    if (!(await hasColumn(conn, "chatbots", "widget_logo_mime"))) {
      console.log("Adding chatbots.widget_logo_mime...");
      await conn.execute(
        "ALTER TABLE chatbots ADD COLUMN widget_logo_mime VARCHAR(50) DEFAULT NULL"
      );
      console.log("  OK");
    } else {
      console.log("chatbots.widget_logo_mime already exists, skip.");
    }
    if (!(await hasColumn(conn, "chatbots", "widget_logo_base64"))) {
      console.log("Adding chatbots.widget_logo_base64...");
      await conn.execute(
        "ALTER TABLE chatbots ADD COLUMN widget_logo_base64 LONGTEXT DEFAULT NULL"
      );
      console.log("  OK");
    } else {
      console.log("chatbots.widget_logo_base64 already exists, skip.");
    }

    // conversation_usage (per-user per-month count for limits)
    const [cuTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'conversation_usage'",
      [database]
    );
    if (!Array.isArray(cuTables) || cuTables.length === 0) {
      console.log("Creating conversation_usage...");
      await conn.execute(`
        CREATE TABLE conversation_usage (
          id              CHAR(36) PRIMARY KEY,
          user_id         CHAR(36) NOT NULL,
          period_month    CHAR(7) NOT NULL,
          count_used      INT DEFAULT 0,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_usage_user_period (user_id, period_month),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_usage_user (user_id)
        )
      `);
      console.log("  OK");
    } else {
      console.log("conversation_usage already exists, skip.");
    }

    // 003: user_external_endpoints (per-user API endpoints for their DB)
    const [uepTables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_external_endpoints'",
      [database]
    );
    if (!Array.isArray(uepTables) || uepTables.length === 0) {
      console.log("Creating user_external_endpoints...");
      await conn.execute(`
        CREATE TABLE user_external_endpoints (
          id              CHAR(36) PRIMARY KEY,
          user_id         CHAR(36) NOT NULL,
          chatbot_id      CHAR(36) DEFAULT NULL,
          name            VARCHAR(100) NOT NULL,
          base_url        VARCHAR(500) NOT NULL,
          auth_type       ENUM('none', 'bearer', 'api_key_header', 'basic') DEFAULT 'none',
          auth_value      VARCHAR(500) DEFAULT NULL,
          method_default  VARCHAR(10) DEFAULT 'GET',
          is_active       TINYINT(1) DEFAULT 1,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_uep_user (user_id),
          INDEX idx_uep_chatbot (chatbot_id)
        )
      `);
      console.log("  OK");
    } else {
      console.log("user_external_endpoints already exists, skip.");
    }

    // Live agent takeover (conversations.handoff_mode, chat_messages.role includes agent)
    if (!(await hasColumn(conn, "conversations", "handoff_mode"))) {
      console.log("Adding conversations.handoff_mode...");
      await conn.execute(
        "ALTER TABLE conversations ADD COLUMN handoff_mode VARCHAR(16) NOT NULL DEFAULT 'ai'"
      );
      console.log("  OK");
    } else {
      console.log("conversations.handoff_mode already exists, skip.");
    }
    if (!(await hasColumn(conn, "conversations", "assigned_agent_id"))) {
      console.log("Adding conversations.assigned_agent_id...");
      await conn.execute("ALTER TABLE conversations ADD COLUMN assigned_agent_id CHAR(36) NULL");
      console.log("  OK");
    } else {
      console.log("conversations.assigned_agent_id already exists, skip.");
    }
    const [roleColRows] = await conn.execute(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'role'",
      [database]
    );
    const roleType = roleColRows && roleColRows[0] ? String(roleColRows[0].COLUMN_TYPE || "").toLowerCase() : "";
    if (roleType && roleType.indexOf("agent") === -1) {
      console.log("Extending chat_messages.role enum (agent)...");
      await conn.execute(
        "ALTER TABLE chat_messages MODIFY COLUMN role ENUM('user', 'assistant', 'agent') NOT NULL"
      );
      console.log("  OK");
    } else {
      console.log("chat_messages.role already includes agent, skip.");
    }

    // Agent notification sound preferences
    if (!(await hasColumn(conn, "users", "notify_sound_new_conversation"))) {
      console.log("Adding users.notify_sound_new_conversation...");
      await conn.execute(
        "ALTER TABLE users ADD COLUMN notify_sound_new_conversation TINYINT(1) NOT NULL DEFAULT 1"
      );
      console.log("  OK");
    } else {
      console.log("users.notify_sound_new_conversation already exists, skip.");
    }
    if (!(await hasColumn(conn, "users", "notify_sound_ongoing_message"))) {
      console.log("Adding users.notify_sound_ongoing_message...");
      await conn.execute(
        "ALTER TABLE users ADD COLUMN notify_sound_ongoing_message TINYINT(1) NOT NULL DEFAULT 0"
      );
      console.log("  OK");
    } else {
      console.log("users.notify_sound_ongoing_message already exists, skip.");
    }

    if (!(await hasColumn(conn, "users", "complimentary_credits"))) {
      console.log("Adding users.complimentary_credits...");
      await conn.execute(
        "ALTER TABLE users ADD COLUMN complimentary_credits INT DEFAULT 0"
      );
      console.log("  OK");
    } else {
      console.log("users.complimentary_credits already exists, skip.");
    }

    console.log("\nMigrations finished.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
