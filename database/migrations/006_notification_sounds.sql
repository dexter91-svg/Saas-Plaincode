-- Agent notification sound preferences (defaults: new on, ongoing off)
ALTER TABLE users
  ADD COLUMN notify_sound_new_conversation TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN notify_sound_ongoing_message TINYINT(1) NOT NULL DEFAULT 0;
