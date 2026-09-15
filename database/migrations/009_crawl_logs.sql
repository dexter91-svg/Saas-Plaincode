-- Migration 009: Add crawl_logs table
-- Tracks every scrape/crawl attempt for auditing and the Logs page

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
