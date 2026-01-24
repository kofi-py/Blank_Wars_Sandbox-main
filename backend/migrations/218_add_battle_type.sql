-- Migration: Add battle_type column to battles table
-- Required for BattleManager.create_battle logic

ALTER TABLE battles
ADD COLUMN battle_type TEXT DEFAULT 'ranked';

-- Add check constraint for valid types
ALTER TABLE battles
ADD CONSTRAINT battles_battle_type_check CHECK (battle_type IN ('ranked', 'casual', 'tournament', 'campaign'));
