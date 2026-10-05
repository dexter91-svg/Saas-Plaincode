-- Migration 010: merchant escalation dashboard (New / Acknowledged / Resolved)
-- order_ref: the customer's order number, captured on the forward form, shown on the dashboard
--   instead of only living inside the forwarded email.
-- acknowledged_at: lets a merchant mark an escalation as "seen / being handled" without having
--   to have a reply ready yet — the missing middle state between "just forwarded" and "resolved".

ALTER TABLE forwarded_conversations
  ADD COLUMN order_ref VARCHAR(255) DEFAULT NULL,
  ADD COLUMN acknowledged_at TIMESTAMP NULL DEFAULT NULL;
