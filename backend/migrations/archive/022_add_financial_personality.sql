-- Migration 022: Add financial personality column to user_characters
-- This column will store the JSONB financial personality data generated from character templates

ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS financial_personality JSONB;