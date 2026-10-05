-- Migration 013: per-user Resend API key.
-- When set, all forwarded-conversation and escalation-alert emails for that user
-- are sent via their own Resend account instead of the server-wide key.

ALTER TABLE users
  ADD COLUMN resend_api_key VARCHAR(255) NULL DEFAULT NULL;
