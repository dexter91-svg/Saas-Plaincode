-- Migration 011: email alerts for escalations left unacknowledged.
-- users.escalation_alert_email: where the alert is sent (NULL = not configured).
-- users.escalation_alert_minutes: how long an escalation may sit in New before alerting.
--   NULL = alerts off, 0 = instant (next check), otherwise minutes.
-- forwarded_conversations.merchant_alerted_at: set once the alert was sent, so each
--   escalation alerts only once.

ALTER TABLE users
  ADD COLUMN escalation_alert_email VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN escalation_alert_minutes INT NULL DEFAULT NULL;

ALTER TABLE forwarded_conversations
  ADD COLUMN merchant_alerted_at TIMESTAMP NULL DEFAULT NULL;
