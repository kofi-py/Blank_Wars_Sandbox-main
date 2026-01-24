-- Migration 047: Fix NULL monthly_earnings values
-- Set monthly_earnings to 0 for any characters where it's NULL

UPDATE user_characters
SET monthly_earnings = 0
WHERE monthly_earnings IS NULL;
