-- Migration 014: refund policy rules per chatbot + priority on forwarded_conversations

ALTER TABLE chatbots
  ADD COLUMN refund_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN refund_max_amount DECIMAL(10,2) NULL DEFAULT NULL,
  ADD COLUMN refund_window_days INT NULL DEFAULT NULL;

ALTER TABLE forwarded_conversations
  ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'normal';
