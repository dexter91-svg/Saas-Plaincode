-- Flag conversations where the customer explicitly asked to speak to a human/agent.
-- Used to pin these conversations to the top of the inbox and trigger an urgent alert sound.
ALTER TABLE conversations
  ADD COLUMN requests_human TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE conversations
  ADD INDEX idx_conversations_requests_human (requests_human);
