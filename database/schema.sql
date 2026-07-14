-- ============================================
-- Ecommerce Support in One Click - MySQL Schema
-- Run this in your MySQL client to create the database and tables
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS ecommerce_support
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecommerce_support;

-- ============================================
-- USERS
-- Stores person/account details
-- ============================================
CREATE TABLE users (
  id              CHAR(36) PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  name            VARCHAR(255) DEFAULT NULL,
  plan            ENUM('free', 'growth', 'pro', 'agency') DEFAULT 'free',
  store_type      ENUM('shopify', 'woocommerce', 'custom') DEFAULT NULL,
  conversation_limit INT NULL DEFAULT 100,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_plan (plan),
  INDEX idx_users_store_type (store_type)
);

-- Password reset tokens (one-time, emailed link)
CREATE TABLE IF NOT EXISTS password_resets (
  id              CHAR(36) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  token_hash      VARCHAR(64) NOT NULL,
  expires_at      TIMESTAMP NOT NULL,
  used_at         TIMESTAMP NULL DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_resets_user (user_id),
  INDEX idx_password_resets_hash (token_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CHATBOTS
-- One user can have multiple chatbots
-- Stores scraped website data and personality
-- ============================================
CREATE TABLE chatbots (
  id              CHAR(36) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  name            VARCHAR(255) DEFAULT 'Plainbot',
  website_url     VARCHAR(500) NOT NULL,
  website_title   VARCHAR(500) DEFAULT NULL,
  website_description TEXT DEFAULT NULL,
  website_content LONGTEXT DEFAULT NULL,
  products_json   JSON DEFAULT NULL,
  personality     ENUM('Friendly', 'Professional', 'Sales-focused', 'Premium Luxury') DEFAULT 'Friendly',
  language        VARCHAR(20) DEFAULT 'en',
  guard_rails       TEXT DEFAULT NULL,
  uploaded_docs_text LONGTEXT DEFAULT NULL,
  widget_snippet    TEXT DEFAULT NULL,
  widget_accent_color VARCHAR(7) DEFAULT NULL,
  widget_logo_mime VARCHAR(50) DEFAULT NULL,
  widget_logo_base64 LONGTEXT DEFAULT NULL,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chatbots_user (user_id),
  INDEX idx_chatbots_active (is_active)
);

-- ============================================
-- CHATBOT DOCUMENTS (multiple PDF/TXT extracts per bot)
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_documents (
  id              CHAR(36) PRIMARY KEY,
  chatbot_id      CHAR(36) NOT NULL,
  file_name       VARCHAR(500) NOT NULL,
  content         LONGTEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
  INDEX idx_chatbot_documents_bot (chatbot_id)
);

-- ============================================
-- RAG: embedded chunks (website, documents, catalog) for retrieval at chat time
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_knowledge_chunks (
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
) ENGINE=InnoDB;

-- ============================================
-- CONVERSATIONS
-- Chat sessions (each session = one customer chat)
-- ============================================
CREATE TABLE conversations (
  id              CHAR(36) PRIMARY KEY,
  chatbot_id      CHAR(36) NOT NULL,
  customer_email  VARCHAR(255) DEFAULT NULL,
  customer_name   VARCHAR(255) DEFAULT NULL,
  status          ENUM('open', 'resolved', 'forwarded') DEFAULT 'open',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
  INDEX idx_conversations_chatbot (chatbot_id),
  INDEX idx_conversations_created (created_at)
);

-- ============================================
-- CHAT_MESSAGES
-- Individual messages within a conversation
-- ============================================
CREATE TABLE chat_messages (
  id              CHAR(36) PRIMARY KEY,
  conversation_id  CHAR(36) NOT NULL,
  role            ENUM('user', 'assistant') NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id)
);

-- ============================================
-- FORWARDED_CONVERSATIONS
-- Conversations forwarded to email or as ticket
-- ============================================
CREATE TABLE forwarded_conversations (
  id              CHAR(36) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  customer        VARCHAR(255) DEFAULT NULL,
  preview         TEXT DEFAULT NULL,
  forwarded_as    ENUM('email', 'ticket') NOT NULL,
  ticket_ref      VARCHAR(100) DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_forwarded_user (user_id),
  INDEX idx_forwarded_created (created_at)
);

-- ============================================
-- ACTIVITY_LOG
-- Recent activity (resolved, forwarded, system, etc.)
-- ============================================
CREATE TABLE activity_log (
  id              CHAR(36) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  chatbot_id      CHAR(36) DEFAULT NULL,
  type            ENUM('resolved', 'query', 'forwarded', 'system', 'warning') NOT NULL,
  title           VARCHAR(255) NOT NULL,
  detail          TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE SET NULL,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_created (created_at)
);

-- ============================================
-- TICKETS (Pro plan only)
-- Every query gets a ticket: AI resolved, forwarded to email,
-- forwarded to human, database lookup, etc.
-- ============================================
CREATE TABLE tickets (
  id              CHAR(36) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  conversation_id CHAR(36) DEFAULT NULL,
  ticket_ref      VARCHAR(50) NOT NULL,
  type            ENUM('ai_resolved', 'forwarded_email', 'forwarded_human', 'database_check', 'escalated', 'other') NOT NULL,
  customer        VARCHAR(255) DEFAULT NULL,
  query_preview   TEXT DEFAULT NULL,
  outcome         TEXT DEFAULT NULL,
  status          ENUM('open', 'resolved', 'in_progress') DEFAULT 'resolved',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  UNIQUE KEY uk_ticket_ref (ticket_ref),
  INDEX idx_tickets_user (user_id),
  INDEX idx_tickets_type (type),
  INDEX idx_tickets_created (created_at)
);

-- ============================================
-- CONVERSATION_USAGE
-- Tracks conversation count per user per plan period
-- ============================================
CREATE TABLE conversation_usage (
  id              CHAR(36) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  period_month    CHAR(7) NOT NULL,
  count_used       INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usage_user_period (user_id, period_month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_usage_user (user_id)
);
