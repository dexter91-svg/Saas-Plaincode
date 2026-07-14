-- Add store_type to users (for existing databases)
-- No AFTER clause so it works even if plan column doesn't exist
ALTER TABLE users ADD COLUMN store_type ENUM('shopify', 'woocommerce', 'custom') DEFAULT NULL;
ALTER TABLE users ADD INDEX idx_users_store_type (store_type);
