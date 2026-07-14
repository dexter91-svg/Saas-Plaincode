-- Stripe IDs (written by checkout + /api/webhooks/stripe). Run once; skip if columns already exist.
ALTER TABLE users
  ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN stripe_subscription_id VARCHAR(255) DEFAULT NULL;

CREATE INDEX idx_users_stripe_subscription ON users (stripe_subscription_id);
