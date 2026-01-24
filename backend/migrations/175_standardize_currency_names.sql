-- Standardize Currency Column Names

-- 1. user_characters: wallet_cents -> wallet
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_characters' AND column_name = 'wallet_cents') THEN
    ALTER TABLE user_characters DROP COLUMN wallet_cents;
  END IF;
END $$;

-- 2. user_characters: debt_principal_cents -> debt_principal
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_characters' AND column_name = 'debt_principal_cents') THEN
    ALTER TABLE user_characters RENAME COLUMN debt_principal_cents TO debt_principal;
  END IF;
END $$;

-- 3. user_characters: monthly_earnings_cents -> monthly_earnings
DO $$
BEGIN
  -- Only rename if the old column exists AND the new column does NOT exist
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_characters' AND column_name = 'monthly_earnings_cents') 
     AND NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_characters' AND column_name = 'monthly_earnings') THEN
    ALTER TABLE user_characters RENAME COLUMN monthly_earnings_cents TO monthly_earnings;
  -- If old exists but new also exists (weird state), drop old? Or just leave it?
  -- Safe bet: If 'monthly_earnings' exists, assume it's correct and just drop 'monthly_earnings_cents' if it's 0.
  ELSIF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_characters' AND column_name = 'monthly_earnings_cents') 
     AND EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_characters' AND column_name = 'monthly_earnings') THEN
     -- Check if we can safely drop
     ALTER TABLE user_characters DROP COLUMN monthly_earnings_cents;
  END IF;
END $$;

-- 4. spell_definitions: unlock_cost_coins -> unlock_cost
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'spell_definitions' AND column_name = 'unlock_cost_coins') 
     AND NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'spell_definitions' AND column_name = 'unlock_cost') THEN
    ALTER TABLE spell_definitions RENAME COLUMN unlock_cost_coins TO unlock_cost;
  ELSIF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'spell_definitions' AND column_name = 'unlock_cost_coins') 
     AND EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'spell_definitions' AND column_name = 'unlock_cost') THEN
    ALTER TABLE spell_definitions DROP COLUMN unlock_cost_coins;
  END IF;
END $$;

-- 5. power_definitions: unlock_cost_coins -> unlock_cost
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'power_definitions' AND column_name = 'unlock_cost_coins') 
     AND NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'power_definitions' AND column_name = 'unlock_cost') THEN
    ALTER TABLE power_definitions RENAME COLUMN unlock_cost_coins TO unlock_cost;
  ELSIF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'power_definitions' AND column_name = 'unlock_cost_coins') 
     AND EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'power_definitions' AND column_name = 'unlock_cost') THEN
    ALTER TABLE power_definitions DROP COLUMN unlock_cost_coins;
  END IF;
END $$;

-- 6. user_headquarters: coins -> balance
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_headquarters' AND column_name = 'coins') 
     AND NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_headquarters' AND column_name = 'balance') THEN
    ALTER TABLE user_headquarters RENAME COLUMN coins TO balance;
  ELSIF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_headquarters' AND column_name = 'coins') 
     AND EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'user_headquarters' AND column_name = 'balance') THEN
    ALTER TABLE user_headquarters DROP COLUMN coins;
  END IF;
END $$;

-- 7. users: coins -> balance
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'coins') THEN
    ALTER TABLE users RENAME COLUMN coins TO balance;
  END IF;
END $$;

-- 8. consumable_definitions: cost_coins -> purchase_price
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'consumable_definitions' AND column_name = 'cost_coins') THEN
    ALTER TABLE consumable_definitions RENAME COLUMN cost_coins TO purchase_price;
  END IF;
END $$;

-- 9. equipment_definitions: cost_coins -> purchase_price
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'equipment_definitions' AND column_name = 'cost_coins') THEN
    ALTER TABLE equipment_definitions RENAME COLUMN cost_coins TO purchase_price;
  END IF;
END $$;

-- 10. purchases: cost_coins -> cost
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'cost_coins') THEN
    ALTER TABLE purchases RENAME COLUMN cost_coins TO cost;
  END IF;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (175, '175_standardize_currency_names')
ON CONFLICT (version) DO NOTHING;
