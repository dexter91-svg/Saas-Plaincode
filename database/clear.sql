-- Clear all data (keeps tables). Run when you want a fresh start.
-- Pick your database on the CLI (do not rely on USE — works for local + Railway):
--   mysql -h HOST -P PORT -u USER -p DB_NAME < database/clear.sql
--   mysql "mysql://USER:PASS@HOST:PORT/DB_NAME" < database/clear.sql

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE activity_log;
TRUNCATE TABLE chat_messages;
TRUNCATE TABLE conversation_usage;
TRUNCATE TABLE forwarded_conversations;
TRUNCATE TABLE tickets;
TRUNCATE TABLE conversations;
TRUNCATE TABLE user_external_endpoints;
TRUNCATE TABLE chatbot_documents;
TRUNCATE TABLE chatbots;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;
