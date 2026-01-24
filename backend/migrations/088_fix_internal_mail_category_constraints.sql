-- Migration: Fix Internal Mail Category Constraints
-- Description: Change player_mail/player_message to user_mail/user_message to match codebase
-- Date: 2025-11-17

-- Drop old constraints
ALTER TABLE internal_mail_messages
  DROP CONSTRAINT IF EXISTS internal_mail_messages_message_type_check;

ALTER TABLE internal_mail_messages
  DROP CONSTRAINT IF EXISTS internal_mail_messages_category_check;

-- Add new constraints with user_ prefix
ALTER TABLE internal_mail_messages
  ADD CONSTRAINT internal_mail_messages_message_type_check
  CHECK (message_type IN ('user_mail', 'system_mail'));

ALTER TABLE internal_mail_messages
  ADD CONSTRAINT internal_mail_messages_category_check
  CHECK (category IN ('system', 'notification', 'reward', 'achievement', 'user_message'));
