-- Per-user external API endpoints for their own databases (e.g. product API, order API).
-- Each user can add endpoints; the chatbot uses the right one per user when answering.
-- Run after schema.sql / existing migrations.

CREATE TABLE IF NOT EXISTS user_external_endpoints (
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
);
