-- OAuth-connected Shopify stores (Admin API access, replacing public-feed scraping for Shopify)
CREATE TABLE IF NOT EXISTS shopify_connections (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id       CHAR(36)     NOT NULL,
  shop_domain   VARCHAR(255) NOT NULL,
  access_token  VARCHAR(255) NOT NULL,
  scope         VARCHAR(255) NULL,
  installed_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_shopify_connections_shop (shop_domain),
  INDEX idx_shopify_connections_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
