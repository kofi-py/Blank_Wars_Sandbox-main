-- Migration: Change user_mail to coach_mail
-- Description: Rename user_mail to coach_mail and user_message to coach_message to standardize coach terminology
-- Date: 2025-11-18

-- Drop old constraints
ALTER TABLE internal_mail_messages
  DROP CONSTRAINT IF EXISTS internal_mail_messages_message_type_check;

ALTER TABLE internal_mail_messages
  DROP CONSTRAINT IF EXISTS internal_mail_messages_category_check;

-- Update existing data from user_mail to coach_mail
UPDATE internal_mail_messages
SET message_type = 'coach_mail'
WHERE message_type = 'user_mail';

-- Update existing data from user_message to coach_message
UPDATE internal_mail_messages
SET category = 'coach_message'
WHERE category = 'user_message';

-- Add new constraints with coach_ prefix
-- Add new constraints with coach_ prefix
ALTER TABLE internal_mail_messages DROP CONSTRAINT IF EXISTS internal_mail_messages_message_type_check;
ALTER TABLE internal_mail_messages
  ADD CONSTRAINT internal_mail_messages_message_type_check
  CHECK (message_type IN ('coach_mail', 'system_mail'));

ALTER TABLE internal_mail_messages DROP CONSTRAINT IF EXISTS internal_mail_messages_category_check;
ALTER TABLE internal_mail_messages
  ADD CONSTRAINT internal_mail_messages_category_check
  CHECK (category IN ('system', 'notification', 'reward', 'achievement', 'coach_message', 'team'));

-- Update comments
COMMENT ON COLUMN internal_mail_messages.message_type IS 'Type of message: coach_mail (between coaches) or system_mail (from system)';
COMMENT ON COLUMN internal_mail_messages.category IS 'Category for filtering: system, notification, reward, achievement, coach_message';
