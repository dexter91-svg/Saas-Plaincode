-- Migration 015: admin flag on users (for internal founder analytics dashboard access)

ALTER TABLE users
  ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0;
