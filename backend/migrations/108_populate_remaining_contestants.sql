-- Migration 107: Populate financial personality for remaining 16 contestants
-- Migration 104 only covered 17 contestants, this covers the other 16

-- Aleister Crowley
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['power', 'knowledge', 'occult mysteries'],
  financial_wisdom = 85,
  risk_tolerance = 90,
  luxury_desire = 80,
  generosity = 30,
  financial_traumas = ARRAY['Squandered family fortune on occult pursuits'],
  money_beliefs = ARRAY['Magic requires resources', 'Do what thou wilt', 'Power through knowledge']
WHERE id = 'aleister_crowley';

-- Archangel Michael
UPDATE characters SET
  spending_style = 'conservative',
  money_motivations = ARRAY['divine duty', 'protection', 'righteousness'],
  financial_wisdom = 95,
  risk_tolerance = 40,
  luxury_desire = 5,
  generosity = 90,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Earthly wealth is temporary', 'Service over riches', 'Divine providence suffices']
WHERE id = 'archangel_michael';

-- Crumbsworth
UPDATE characters SET
  spending_style = 'conservative',
  money_motivations = ARRAY['security', 'routine', 'simple pleasures'],
  financial_wisdom = 60,
  risk_tolerance = 10,
  luxury_desire = 15,
  generosity = 70,
  financial_traumas = ARRAY['Lost crumbs to birds'],
  money_beliefs = ARRAY['Save for a rainy day', 'Small joys matter most', 'Safety in savings']
WHERE id = 'crumbsworth';

-- Don Quixote
UPDATE characters SET
  spending_style = 'impulsive',
  money_motivations = ARRAY['chivalry', 'honor', 'grand gestures'],
  financial_wisdom = 20,
  risk_tolerance = 95,
  luxury_desire = 60,
  generosity = 85,
  financial_traumas = ARRAY['Sold estate to fund knightly adventures'],
  money_beliefs = ARRAY['Honor before wealth', 'Fortune favors the brave', 'A knights duty costs dearly']
WHERE id = 'don_quixote';

-- Jack the Ripper
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['secrecy', 'control', 'freedom'],
  financial_wisdom = 70,
  risk_tolerance = 85,
  luxury_desire = 40,
  generosity = 10,
  financial_traumas = ARRAY['Poverty in Whitechapel'],
  money_beliefs = ARRAY['Money buys silence', 'Leave no trace', 'Trust no one']
WHERE id = 'jack_the_ripper';

-- Kali
UPDATE characters SET
  spending_style = 'impulsive',
  money_motivations = ARRAY['destruction', 'transformation', 'chaos'],
  financial_wisdom = 75,
  risk_tolerance = 100,
  luxury_desire = 50,
  generosity = 60,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Destroy to create', 'Chaos brings balance', 'Material wealth is illusion']
WHERE id = 'kali';

-- Kangaroo
UPDATE characters SET
  spending_style = 'moderate',
  money_motivations = ARRAY['family', 'territory', 'survival'],
  financial_wisdom = 45,
  risk_tolerance = 60,
  luxury_desire = 25,
  generosity = 70,
  financial_traumas = ARRAY['Habitat loss to development'],
  money_beliefs = ARRAY['Protect the mob', 'Territory is wealth', 'Adapt or perish']
WHERE id = 'kangaroo';

-- Karna
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['honor', 'loyalty', 'proving worth'],
  financial_wisdom = 80,
  risk_tolerance = 75,
  luxury_desire = 60,
  generosity = 95,
  financial_traumas = ARRAY['Born to poverty despite divine lineage'],
  money_beliefs = ARRAY['Generosity defines nobility', 'Honor over wealth', 'Give to those in need']
WHERE id = 'karna';

-- Little Bo Peep
UPDATE characters SET
  spending_style = 'conservative',
  money_motivations = ARRAY['caring for flock', 'simplicity', 'duty'],
  financial_wisdom = 55,
  risk_tolerance = 20,
  luxury_desire = 10,
  generosity = 80,
  financial_traumas = ARRAY['Lost her sheep'],
  money_beliefs = ARRAY['Count your blessings', 'Simple life is best', 'Care for what you have']
WHERE id = 'little_bo_peep';

-- Mami Wata
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['beauty', 'power', 'devotion'],
  financial_wisdom = 90,
  risk_tolerance = 70,
  luxury_desire = 95,
  generosity = 50,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Beauty has value', 'Water spirits control wealth', 'Devotion brings prosperity']
WHERE id = 'mami_wata';

-- Napoleon Bonaparte
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['empire', 'legacy', 'dominance'],
  financial_wisdom = 90,
  risk_tolerance = 85,
  luxury_desire = 80,
  generosity = 40,
  financial_traumas = ARRAY['Childhood poverty in Corsica'],
  money_beliefs = ARRAY['Empire requires investment', 'Victory justifies expense', 'Build to last']
WHERE id = 'napoleon_bonaparte';

-- Quetzalcoatl
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['knowledge', 'civilization', 'balance'],
  financial_wisdom = 95,
  risk_tolerance = 50,
  luxury_desire = 70,
  generosity = 80,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Wisdom creates wealth', 'Balance in all things', 'Knowledge is treasure']
WHERE id = 'quetzalcoatl';

-- Ramses II
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['monuments', 'legacy', 'divine status'],
  financial_wisdom = 90,
  risk_tolerance = 60,
  luxury_desire = 100,
  generosity = 50,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Build for eternity', 'Pharaohs deserve splendor', 'Legacy through monuments']
WHERE id = 'ramses_ii';

-- Shaka Zulu
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['military strength', 'unification', 'dominance'],
  financial_wisdom = 85,
  risk_tolerance = 90,
  luxury_desire = 50,
  generosity = 60,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Strength brings wealth', 'United we prosper', 'Invest in warriors']
WHERE id = 'shaka_zulu';

-- Unicorn
UPDATE characters SET
  spending_style = 'conservative',
  money_motivations = ARRAY['purity', 'magic', 'freedom'],
  financial_wisdom = 60,
  risk_tolerance = 30,
  luxury_desire = 40,
  generosity = 85,
  financial_traumas = ARRAY['Hunted for horn value'],
  money_beliefs = ARRAY['Magic cannot be bought', 'Purity over wealth', 'True value is inner']
WHERE id = 'unicorn';

-- Velociraptor
UPDATE characters SET
  spending_style = 'impulsive',
  money_motivations = ARRAY['hunt', 'pack survival', 'territory'],
  financial_wisdom = 15,
  risk_tolerance = 95,
  luxury_desire = 5,
  generosity = 60,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Hunt or be hunted', 'Pack shares prey', 'Territory is survival']
WHERE id = 'velociraptor';
