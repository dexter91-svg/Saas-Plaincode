-- Track token usage and AI cost per request
CREATE TABLE IF NOT EXISTS ai_usage (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id      CHAR(36)     NULL,
  provider     VARCHAR(32)  NOT NULL,
  model        VARCHAR(64)  NOT NULL,
  input_tokens INT          NOT NULL DEFAULT 0,
  output_tokens INT         NOT NULL DEFAULT 0,
  cost_usd     DECIMAL(10,8) NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ai_usage_user_id   (user_id),
  INDEX idx_ai_usage_created_at (created_at),
  INDEX idx_ai_usage_provider  (provider)
);
