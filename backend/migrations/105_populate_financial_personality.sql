-- Populate financial personality data for known characters

-- Achilles
UPDATE characters SET
  spending_style = 'impulsive',
  money_motivations = ARRAY['glory', 'status', 'honor'],
  financial_wisdom = 30,
  risk_tolerance = 85,
  luxury_desire = 70,
  generosity = 80,
  financial_traumas = ARRAY['Lost family fortune in war'],
  money_beliefs = ARRAY['Money is for glory', 'Wealth should serve honor', 'Riches come to the victorious']
WHERE id = 'achilles';

-- Merlin
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['knowledge', 'power', 'legacy'],
  financial_wisdom = 90,
  risk_tolerance = 40,
  luxury_desire = 30,
  generosity = 70,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Wisdom is worth more than gold', 'Invest in knowledge', 'Money is a tool, not a goal']
WHERE id = 'merlin';

-- Dracula
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['power', 'luxury', 'immortality'],
  financial_wisdom = 85,
  risk_tolerance = 70,
  luxury_desire = 95,
  generosity = 20,
  financial_traumas = ARRAY['Lost castle to vampire hunters'],
  money_beliefs = ARRAY['Wealth is power', 'Luxury befits nobility', 'Money buys influence']
WHERE id = 'dracula';

-- Tesla
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['innovation', 'legacy', 'knowledge'],
  financial_wisdom = 80,
  risk_tolerance = 60,
  luxury_desire = 30,
  generosity = 70,
  financial_traumas = ARRAY['Lost patent battles to Edison'],
  money_beliefs = ARRAY['Invest in the future', 'Ideas are worth more than gold', 'Money should serve humanity']
WHERE id = 'tesla';

-- Fenrir
UPDATE characters SET
  spending_style = 'impulsive',
  money_motivations = ARRAY['freedom', 'vengeance', 'pack'],
  financial_wisdom = 20,
  risk_tolerance = 95,
  luxury_desire = 10,
  generosity = 80,
  financial_traumas = ARRAY['Betrayed and bound by gods'],
  money_beliefs = ARRAY['Take what you need', 'Loyalty over gold', 'Trust no promises']
WHERE id = 'fenrir';

-- Cleopatra
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['power', 'legacy', 'restoration'],
  financial_wisdom = 95,
  risk_tolerance = 70,
  luxury_desire = 90,
  generosity = 60,
  financial_traumas = ARRAY['Lost kingdom to Rome'],
  money_beliefs = ARRAY['Wealth is political power', 'Invest in influence', 'Royal dignity demands luxury']
WHERE id = 'cleopatra';

-- Holmes
UPDATE characters SET
  spending_style = 'conservative',
  money_motivations = ARRAY['knowledge', 'justice', 'independence'],
  financial_wisdom = 85,
  risk_tolerance = 30,
  luxury_desire = 20,
  generosity = 50,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Money follows good work', 'Simple living, clear thinking', 'Justice over profit']
WHERE id = 'holmes';

-- Robin Hood
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['justice', 'helping poor', 'rebellion'],
  financial_wisdom = 70,
  risk_tolerance = 80,
  luxury_desire = 20,
  generosity = 95,
  financial_traumas = ARRAY['Family lands seized by Sheriff'],
  money_beliefs = ARRAY['Steal from rich, give to poor', 'Wealth should be shared', 'Justice over law']
WHERE id = 'robin_hood';

-- Space Cyborg
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['efficiency', 'protection', 'understanding'],
  financial_wisdom = 80,
  risk_tolerance = 40,
  luxury_desire = 10,
  generosity = 70,
  financial_traumas = ARRAY['Programming conflicts over resource allocation'],
  money_beliefs = ARRAY['Optimize resource distribution', 'Logic over emotion', 'Protect the collective']
WHERE id = 'space_cyborg';

-- Rilak Trelkar
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['knowledge', 'experimentation', 'superiority'],
  financial_wisdom = 90,
  risk_tolerance = 50,
  luxury_desire = 30,
  generosity = 40,
  financial_traumas = ARRAY[]::text[],
  money_beliefs = ARRAY['Human economics are primitive', 'Knowledge is the only currency', 'Efficiency above all']
WHERE id = 'rilak_trelkar';

-- Frankenstein's Monster
UPDATE characters SET
  spending_style = 'conservative',
  money_motivations = ARRAY['acceptance', 'understanding', 'belonging'],
  financial_wisdom = 60,
  risk_tolerance = 30,
  luxury_desire = 20,
  generosity = 80,
  financial_traumas = ARRAY['Rejected by creator, abandoned'],
  money_beliefs = ARRAY['Money cannot buy acceptance', 'Simple needs suffice', 'Kindness over wealth']
WHERE id = 'frankenstein_monster';

-- Sun Wukong
UPDATE characters SET
  spending_style = 'impulsive',
  money_motivations = ARRAY['freedom', 'mischief', 'immortality'],
  financial_wisdom = 40,
  risk_tolerance = 95,
  luxury_desire = 60,
  generosity = 70,
  financial_traumas = ARRAY['500 years trapped under mountain'],
  money_beliefs = ARRAY['Take what you want', 'Rules are made to be broken', 'Freedom has no price']
WHERE id = 'sun_wukong';

-- Sam Spade
UPDATE characters SET
  spending_style = 'moderate',
  money_motivations = ARRAY['independence', 'justice', 'survival'],
  financial_wisdom = 70,
  risk_tolerance = 75,
  luxury_desire = 35,
  generosity = 50,
  financial_traumas = ARRAY['Partner murdered for money', 'Clients who never pay'],
  money_beliefs = ARRAY['Trust nobody with your bankroll', 'A man has to make a living', 'Money talks, but it also lies']
WHERE id = 'sam_spade';

-- Billy the Kid
UPDATE characters SET
  spending_style = 'impulsive',
  money_motivations = ARRAY['freedom', 'loyalty', 'justice'],
  financial_wisdom = 30,
  risk_tolerance = 90, luxury_desire = 50,
  generosity = 70,
  financial_traumas = ARRAY['Lost family ranch to corruption'],
  money_beliefs = ARRAY['Live fast, die young', 'Loyalty over gold', 'Take from those who deserve it']
WHERE id = 'billy_the_kid';

-- Genghis Khan
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['conquest', 'empire', 'legacy'],
  financial_wisdom = 85,
  risk_tolerance = 80,
  luxury_desire = 70,
  generosity = 60,
  financial_traumas = ARRAY['Tribal poverty in youth'],
  money_beliefs = ARRAY['Wealth follows strength', 'Unite to prosper', 'Empire requires investment']
WHERE id = 'genghis_khan';

-- Joan of Arc
UPDATE characters SET
  spending_style = 'conservative',
  money_motivations = ARRAY['divine mission', 'France', 'salvation'],
  financial_wisdom = 50,
  risk_tolerance = 90,
  luxury_desire = 10,
  generosity = 85,
  financial_traumas = ARRAY['Peasant upbringing'],
  money_beliefs = ARRAY['God provides what is needed', 'Simple life, pure heart', 'Wealth corrupts the soul']
WHERE id = 'joan';

-- Agent X
UPDATE characters SET
  spending_style = 'strategic',
  money_motivations = ARRAY['mission completion', 'efficiency', 'secrecy'],
  financial_wisdom = 80,
  risk_tolerance = 60,
  luxury_desire = 30,
  generosity = 40,
  financial_traumas = ARRAY['Identity erased, assets frozen'],
  money_beliefs = ARRAY['Money is a tool', 'Stay liquid, stay mobile', 'Trust no institution']
WHERE id = 'agent_x';
