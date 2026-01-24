-- Migration 234: Fix battles.winner_id schema
-- Goal: Convert winner_id to UUID to match users.id and fix "operator does not exist: text = uuid" errors.

BEGIN;

-- 1. Prune invalid winner_ids (Safety Check)
-- Remove any winner_ids that aren't valid UUIDs before conversion
DELETE FROM battles 
WHERE winner_id IS NOT NULL 
  AND winner_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Convert winner_id to UUID
ALTER TABLE battles 
  ALTER COLUMN winner_id TYPE UUID USING winner_id::uuid;

-- 3. Restore Foreign Key Constraint
-- Ensure winner_id references a valid user
DELETE FROM battles 
WHERE winner_id IS NOT NULL 
  AND winner_id NOT IN (SELECT id FROM users);

ALTER TABLE battles
  ADD CONSTRAINT battles_winner_id_fkey 
  FOREIGN KEY (winner_id) REFERENCES users(id);

COMMIT;
