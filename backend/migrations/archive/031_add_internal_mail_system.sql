-- Migration: Add Internal Mail System
-- Description: Create tables for the internal mail system with PostgreSQL support
-- Date: 2025-09-16

-- Create internal_mail_messages table
CREATE TABLE IF NOT EXISTS internal_mail_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_username VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('player_mail', 'system_mail')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('system', 'notification', 'reward', 'achievement', 'player_message')),
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    sender_signature TEXT,
    reply_to_mail_id UUID REFERENCES internal_mail_messages(id) ON DELETE SET NULL,
    has_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_data JSONB,
    attachment_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_mail_recipient_user_id ON internal_mail_messages(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_internal_mail_sender_user_id ON internal_mail_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_internal_mail_category ON internal_mail_messages(category);
CREATE INDEX IF NOT EXISTS idx_internal_mail_is_read ON internal_mail_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_internal_mail_is_deleted ON internal_mail_messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_internal_mail_created_at ON internal_mail_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_internal_mail_message_type ON internal_mail_messages(message_type);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_internal_mail_user_read_deleted ON internal_mail_messages(recipient_user_id, is_read, is_deleted);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_internal_mail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_internal_mail_updated_at ON internal_mail_messages;
CREATE TRIGGER update_internal_mail_updated_at
    BEFORE UPDATE ON internal_mail_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_internal_mail_updated_at();

-- Add comments for documentation
COMMENT ON TABLE internal_mail_messages IS 'Internal mail system for player-to-player and system-to-player messages';
COMMENT ON COLUMN internal_mail_messages.recipient_user_id IS 'User who receives the message';
COMMENT ON COLUMN internal_mail_messages.sender_user_id IS 'User who sent the message (null for system messages)';
COMMENT ON COLUMN internal_mail_messages.message_type IS 'Type of message: player_mail or system_mail';
COMMENT ON COLUMN internal_mail_messages.category IS 'Category for filtering: system, notification, reward, achievement, player_message';
COMMENT ON COLUMN internal_mail_messages.attachment_data IS 'JSON data for claimable rewards and items';
COMMENT ON COLUMN internal_mail_messages.reply_to_mail_id IS 'Reference to original message for threading';