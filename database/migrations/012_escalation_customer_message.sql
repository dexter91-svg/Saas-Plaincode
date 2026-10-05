-- Migration 012: keep the "How can we help?" text from the contact form.
-- Previously it was only used as a preview when the chat had no messages, so it was dropped otherwise.

ALTER TABLE forwarded_conversations
  ADD COLUMN customer_message TEXT NULL DEFAULT NULL;
