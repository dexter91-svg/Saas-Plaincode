-- Live agent takeover: human can take chat from AI; messages stored for AI context after release.
ALTER TABLE conversations
  ADD COLUMN handoff_mode VARCHAR(16) NOT NULL DEFAULT 'ai',
  ADD COLUMN assigned_agent_id CHAR(36) NULL;

-- Extend message roles (MySQL 8+). If MODIFY fails, run per-environment or use VARCHAR for role.
ALTER TABLE chat_messages
  MODIFY COLUMN role ENUM('user', 'assistant', 'agent') NOT NULL;
