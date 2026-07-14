-- Add forward_email to users (where to send forwarded conversations)
ALTER TABLE users
  ADD COLUMN forward_email VARCHAR(255) DEFAULT NULL;

-- Create forwarded_conversations if it doesn't exist (e.g. you use a DB that never ran full schema)
-- Includes reply_text and replied_at so support replies show in chat
CREATE TABLE IF NOT EXISTS forwarded_conversations (
  id              CHAR(36) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  customer        VARCHAR(255) DEFAULT NULL,
  preview         TEXT DEFAULT NULL,
  forwarded_as    ENUM('email', 'ticket') NOT NULL DEFAULT 'email',
  ticket_ref      VARCHAR(100) DEFAULT NULL,
  reply_text      TEXT DEFAULT NULL,
  replied_at      TIMESTAMP NULL DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_forwarded_user (user_id),
  INDEX idx_forwarded_created (created_at),
  INDEX idx_forwarded_conversation (conversation_id)
);

-- If the table already existed (from schema.sql) without reply columns, add them:
-- Run these two lines only if you get "Duplicate column" on the CREATE above and your table has no reply_text/replied_at yet.
-- ALTER TABLE forwarded_conversations ADD COLUMN reply_text TEXT DEFAULT NULL;
-- ALTER TABLE forwarded_conversations ADD COLUMN replied_at TIMESTAMP NULL DEFAULT NULL;
