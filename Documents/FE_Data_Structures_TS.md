Entity (Interface/Type)	Attribute (Property)	Type	Notes & Relationships	
Ability	id	string		
	name	string		
	description	string		
	type	active' | 'passive' | 'ultimate' | 'combo'		
	characterId	string		
	archetype	string		
	icon	string		
	effects	AbilityEffect[]	Composition: Contains an array of AbilityEffect objects.	
	cost	AbilityCost	Composition: Contains an AbilityCost object.	
	animation?	string	Optional property	
	sound?	string	Optional property	
	flavor	string		
	unlockLevel	number		
	maxRank	number		
	rankBonuses	{ rank: number; improvements: string[] }[]		
AbilityEffect	type	damage' | 'heal' | 'stat_modifier' | 'status_effect' | 'special'		
	value	number		
	duration?	number	Optional property	
	target	self' | 'enemy' | 'all_enemies' | 'all_allies' | 'battlefield'		
	damageType?	physical' | 'magical' | 'true' | 'heal'	Optional property	
	stat?	atk' | 'def' | 'spd' | 'hp' | 'energy' | 'all'	Optional property	
	statusEffect?	burn' | 'freeze' | 'stun' | 'poison' | 'blind' | 'rage' | 'shield' | 'stealth'	Optional property	
AbilityCost	energy	number		
	cooldown	number		
	requirements?	{ level?: number; hp_threshold?: number; combo_points?: number }	Optional property	
Character	id	string	Likely corresponds to user_characters.id	
	characterId	string	Likely corresponds to characters.id	
	name	string		
	title?	string	Optional property	
	avatar	string		
	archetype	CharacterArchetype	Type Alias	
	rarity	CharacterRarity	Type Alias	
	description	string		
	historicalPeriod	string		
	mythology	string		
	personality	CharacterPersonality	Type Alias	
	level	number		
	baseStats	BaseStats	Type Alias	
	combatStats	CombatStats	Type Alias	
	statPoints	number		
	experience	CharacterExperience	Type Alias	
	skills	CharacterSkills	Type Alias	
	abilities	CharacterAbilities	Type Alias	
	progressionTree	ProgressionTree	Type Alias	
	equippedItems	{ weapon?: Equipment; armor?: Equipment; accessory?: Equipment }		
	inventory	Item[]		
	items	Item[]		
	unlockedContent	string[]		
	achievements	string[]		
	trainingLevel	number		
	bondLevel	number		
	fatigue	number		
	lastTrainingDate?	Date	Optional property	
	psychStats	{ training: number; teamPlayer: number; ego: number; mentalHealth: number; communication: number }		
	financialPersonality	FinancialPersonality	Type Alias	
	financials	{ wallet: number; monthlyEarnings: number; financialStress: number; coachFinancialTrust: number; recentDecisions: FinancialDecision[]; totalEarningsLifetime: number; totalSpentLifetime: number; financialGoals: string[]; moneyRelatedStress: number; lastFinancialDecision?: Date }		
	battleAI	{ aggression: number; defensiveness: number; riskTaking: number; adaptability: number; preferredStrategies: string[] }		
	customization	{ outfit?: string; weaponSkin?: string; battleQuotes: string[]; victoryAnimation?: string }		
	traditionalStats	TraditionalStats	Type Alias	
	temporaryStats	TraditionalStats	Type Alias	
	currentHp	number		
	maxHp	number		
	experienceToNext	number		
	personalityTraits	string[]		
	speakingStyle	formal' | 'casual' | 'archaic' | 'technical' | 'poetic' | 'gruff' | 'mysterious'		
	decisionMaking	logical' | 'emotional' | 'impulsive' | 'calculated'		
	conflictResponse	aggressive' | 'diplomatic' | 'withdrawn' | 'manipulative'		
	statusEffects	string[]		
	injuries	string[]		
	restDaysNeeded	number		
	battleAbilities	BattleAbility[]	Type Alias	
	specialPowers	SpecialPower[]	Type Alias	
UserProfile	id	string		
	username	string		
	email	string		
	avatar	string		
	title	string		
	playerLevel	number		
	totalXP	number		
	joinDate	Date		
	lastActive	Date		
	characterSlotCapacity	number		
	subscriptionTier	SubscriptionTier	Type Alias	
	subscriptionExpiry?	Date	Optional property	
	isActive	boolean		
	currency	PlayerCurrency	Composition: Contains a PlayerCurrency object.	
	preferences	UserPreferences	Composition: Contains a UserPreferences object.	
	stats	PlayerStats	Composition: Contains a PlayerStats object.	
	achievements	Achievement[]		
	charactersOwned	OwnedCharacter[]		
PlayerStats	battlesWon	number		
	battlesLost	number		
	battlesDraw	number		
	totalBattles	number		
	winRate	number		
	winStreak	number		
	bestWinStreak	number		
	trainingSessionsCompleted	number		
	totalTrainingTime	number		
	skillPointsEarned	number		
	trainingPointsEarned	number		
	charactersUnlocked	number		
	totalCharacterLevels	number		
	highestCharacterLevel	number		
	goldEarned	number		
	goldSpent	number		
	itemsUsed	number		
	equipmentCrafted	number		
	perfectBattles	number		
	criticalHitStreak	number		
	abilitiesUnlocked	number		
	totalPlayTime	number		
	dailyPlayStreak	number		
	longestPlayStreak	number		
Equipment	id	string		
	name	string		
	description	string		
	slot	EquipmentSlot	Type Alias	
	type	WeaponType | ArmorType | AccessoryType | string		
	rarity	EquipmentRarity	Type Alias	
	level	number		
	requiredLevel	number		
	requiredArchetype?	string[]	Optional property	
	preferredCharacter?	string	Optional property	
	stats	EquipmentStats	Composition: Contains an EquipmentStats object.	
	effects	EquipmentEffect[]		
	icon	string		
	image?	string	Optional property	
	flavor?	string	Optional property	
	obtainMethod?	shop' | 'craft' | 'drop' | 'quest' | 'event' | 'premium'	Optional property	
	price?	number	Optional property	
	sellPrice?	number	Optional property	
	acquiredFrom?	string	Optional property	
	lore?	string	Optional property	
	promptAddition?	string	Optional property	
	craftingMaterials?	{ item: string; quantity: number }[]	Optional property	
Item	id	string		
	name	string		
	description	string		
	type	ItemType	Type Alias	
	rarity	ItemRarity	Type Alias	
	icon	string		
	effects	ItemEffect[]		
	usageContext	UsageContext	Type Alias	
	stackable	boolean		
	maxStack	number		
	cooldown?	number	Optional property	
	price	number		
	craftingCost?	{ materials: { item: string; quantity: number }[]; gold: number }	Optional property	
	obtainMethod	shop' | 'craft' | 'drop' | 'quest' | 'event' | 'premium'		
	flavor	string		
	consumeOnUse	boolean		
BattleState	id	string		
	phase	BattlePhase	Type Alias	
	teams	{ player: BattleTeam; opponent: BattleTeam }		
	currentRound	number		
	maxRounds	number		
	globalMorale	{ player: number; opponent: number }		
	battleLog	BattleLogEntry[]		
	aiJudgeContext	AIJudgeContext	Type Alias	
	coachingData	CoachingData	Type Alias	
	lastUpdate	Date		
TeamCharacter	id	string		
	name	string		
	avatar	string		
	archetype	CharacterArchetype	Type Alias	
	rarity	CharacterRarity	Type Alias	
	level	number		
	experience	number		
	experienceToNext	number		
	traditionalStats	TraditionalStats	Type Alias	
	currentHp	number		
	maxHp	number		
	psychStats	PsychologicalStats	Type Alias	
	temporaryStats	TraditionalStats	Type Alias	
	personalityTraits	string[]		
	speakingStyle	formal' | 'casual' | 'archaic' | 'technical' | 'poetic' | 'gruff' | 'mysterious'		
	decisionMaking	logical' | 'emotional' | 'impulsive' | 'calculated'		
	conflictResponse	aggressive' | 'diplomatic' | 'withdrawn' | 'manipulative'		
	statusEffects	string[]		
	injuries	string[]		
	restDaysNeeded	number		
	abilities	CharacterAbility[]	Type Alias	
	specialPowers	SpecialPower[]	Type Alias	
	equippedItems	{ weapon?: Equipment; armor?: Equipment; accessory?: Equipment }		
	equipmentBonuses	EquipmentStats	Type Alias	
	coreSkills	{ combat: { level: number; experience: number; maxLevel: number }; survival: { level: number; experience: number; maxLevel: number }; mental: { level: number; experience: number; maxLevel: number }; social: { level: number; experience: number; maxLevel: number }; spiritual: { level: number; experience: number; maxLevel: number } }		
Team	id	string		
	name	string		
	coachName	string		
	characters	TeamCharacter[]	Composition: Contains an array of TeamCharacter objects.	
	coachingPoints	number		
	consecutiveLosses	number		
	teamChemistry	number		
	teamCulture	military' | 'family' | 'divas' | 'chaos' | 'brotherhood' | 'balanced'		
	averageLevel	number		
	totalPower	number		
	psychologyScore	number		
	wins	number		
	losses	number		
	battlesPlayed	number		
	lastBattleDate	Date		
RoundResult	round	number		
	attacker	TeamCharacter		
	defender	TeamCharacter		
	attackerAction	CharacterAbility | 'refused' | 'rogue_action'		
	damage	number		
	wasStrategyAdherent	boolean		
	rogueDescription?	string	Optional property	
	moraleImpact	number		
	newAttackerHp	number		
	newDefenderHp	number		
	narrativeDescription	string		
CharacterSkills	characterId	string		
	coreSkills	Record<string, { level: number; experience: number; maxLevel: number }>		
	signatureSkills?	Record<string, { name: string; level: number; description?: string }>	Optional property	
	archetypeSkills?	Record<string, { name: string; level: number; description?: string }>	Optional property	
	passiveAbilities?	Array<{ id: string; name: string; description: string }>	Optional property	
	activeAbilities?	Array<{ id: string; name: string; description: string; cost?: number }>	Optional property	
	unlockedNodes?	Array<{ id: string; name: string; type: string }>	Optional property	
	lastUpdated?	Date	Optional property	
LevelData	level	number		
	xpRequired	number		
	xpToNext	number		
	statPointsGained	number		
	milestoneReward?	MilestoneReward	Optional property	
	tier	ProgressionTier	Type Alias	
	title	string		
CoachingSession	id	string		
	characterId	string		
	coachName	string		
	sessionType	individual' | 'team' | 'therapy' | 'strategy' | 'motivational'		
	startTime	Date		
	duration	number		
	topics	string[]		
	characterMood	receptive' | 'resistant' | 'neutral' | 'desperate'		
	outcome	CoachingOutcome	Type Alias	
TherapySession	id	string		
	characterId	string		
	therapistName	string		
	sessionNumber	number		
	focusArea	trauma' | 'anger' | 'depression' | 'anxiety' | 'ego' | 'relationships'		
	breakthrough	boolean		
	mentalHealthGain	number		
	characterInsights	string[]		
	nextSessionRecommendation	string		