						
Entity (Table)	Attribute (Column)	Type	Constraints & Relationships			
users	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	username	VARCHAR(30)	UNIQUE, NOT NULL			
	email	VARCHAR(255)	UNIQUE, NOT NULL			
	password_hash	VARCHAR(255)				
	oauth_provider	VARCHAR(20)				
	oauth_id	VARCHAR(255)				
	subscription_tier	subscription_tier ENUM				
	subscription_expires_at	TIMESTAMP				
	stripe_customer_id	VARCHAR(255)				
	daily_play_seconds	INTEGER	DEFAULT 0			
	last_play_reset	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	level	INTEGER	DEFAULT 1, CHECK >= 1			
	experience	INTEGER	DEFAULT 0, CHECK >= 0			
	total_battles	INTEGER	DEFAULT 0, CHECK >= 0			
	total_wins	INTEGER	DEFAULT 0, CHECK >= 0			
	character_slot_capacity	INTEGER	DEFAULT 12			
	avatar	VARCHAR(255)				
	title	VARCHAR(100)				
	player_level	INTEGER	DEFAULT 1			
	total_xp	INTEGER	DEFAULT 0			
	characters_owned	INTEGER	DEFAULT 0			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	last_login	TIMESTAMP				
	join_date	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	last_active	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	is_banned	BOOLEAN	DEFAULT FALSE			
	ban_reason	TEXT				
	daily_training_count	INTEGER	DEFAULT 0, CHECK >= 0			
	daily_training_reset_date	DATE	DEFAULT CURRENT_DATE			
	rating	INTEGER	DEFAULT 1000, CHECK >= 0			
refresh_tokens	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	FOREIGN KEY -> users(id)			
	token	VARCHAR(255)	UNIQUE, NOT NULL			
	expires_at	TIMESTAMP	NOT NULL			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	last_used	TIMESTAMP				
characters	id	VARCHAR(50)	PRIMARY KEY			
	name	VARCHAR(100)	NOT NULL			
	title	VARCHAR(255)				
	archetype	character_archetype ENUM	NOT NULL			
	rarity	character_rarity ENUM	NOT NULL			
	origin_story	TEXT				
	source_material	VARCHAR(100)				
	base_attack	INTEGER	NOT NULL, DEFAULT 100			
	base_defense	INTEGER	NOT NULL, DEFAULT 100			
	base_speed	INTEGER	NOT NULL, DEFAULT 100			
	base_max_health	INTEGER	NOT NULL, DEFAULT 1000			
	base_mental_health	INTEGER	DEFAULT 100			
	base_stress_resistance	INTEGER	DEFAULT 50			
	base_confidence	INTEGER	DEFAULT 50			
	base_teamwork	INTEGER	DEFAULT 50			
	personality_traits	JSONB	DEFAULT '[]'			
	motivations	JSONB	DEFAULT '[]'			
	fears	JSONB	DEFAULT '[]'			
	background_story	TEXT				
	signature_abilities	JSONB	DEFAULT '[]'			
	equipment_slots	JSONB				
	avatar	VARCHAR(255)				
	artwork	JSONB	DEFAULT '{}'			
	color_scheme	VARCHAR(7)				
	level_scaling	JSONB	DEFAULT '{}'			
	unlock_requirements	JSONB	DEFAULT '{}'			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	is_active	BOOLEAN	DEFAULT TRUE			
	training	INTEGER	DEFAULT 75, CHECK BETWEEN 0 AND 100			
	team_player	INTEGER	DEFAULT 70, CHECK BETWEEN 0 AND 100			
	ego	INTEGER	DEFAULT 60, CHECK BETWEEN 0 AND 100			
	mental_health	INTEGER	DEFAULT 85, CHECK BETWEEN 0 AND 100			
	communication	INTEGER	DEFAULT 80, CHECK BETWEEN 0 AND 100			
	origin_era	VARCHAR(50)	DEFAULT 'modern'			
	conversation_style	TEXT	DEFAULT 'formal'			
	conversation_topics	TEXT[]	DEFAULT '{}'			
	backstory	TEXT	DEFAULT ''			
	artwork_url	TEXT	DEFAULT ''			
	abilities	TEXT[]	DEFAULT '{}'			
	comedian_name	TEXT				
	comedy_style	TEXT				
	gameplan_adherence_level	INTEGER	DEFAULT 75			
	current_mental_health	INTEGER	DEFAULT 80			
	stress_level	INTEGER	DEFAULT 25			
	team_trust	INTEGER	DEFAULT 85			
	battle_focus	INTEGER	DEFAULT 90			
	default_mood	VARCHAR(50)	DEFAULT 'neutral'			
	default_energy_level	INTEGER	DEFAULT 100, CHECK >= 0 AND <= 100			
user_characters	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	FOREIGN KEY -> users(id)			
	character_id	VARCHAR(50)	FOREIGN KEY -> characters(id)			
	current_level	INTEGER	DEFAULT 1, CHECK >= 1			
	experience	INTEGER	DEFAULT 0, CHECK >= 0			
	bond_level	INTEGER	DEFAULT 1, CHECK >= 1 AND <= 10			
	current_attack	INTEGER	NOT NULL			
	current_defense	INTEGER	NOT NULL			
	current_speed	INTEGER	NOT NULL			
	current_max_health	INTEGER	NOT NULL			
	current_health	INTEGER	NOT NULL			
	current_mental_health	INTEGER	DEFAULT 85, CHECK BETWEEN 0 AND 100			
	stress	INTEGER	DEFAULT 0			
	confidence	INTEGER	DEFAULT 50			
	battle_focus	INTEGER	DEFAULT 50			
	team_trust	INTEGER	DEFAULT 50			
	strategy_deviation_risk	INTEGER	DEFAULT 30			
	gameplan_adherence	INTEGER	DEFAULT 70			
	equipped_weapon_id	UUID				
	equipped_armor_id	UUID				
	equipped_accessory_id	UUID				
	skill_points	INTEGER	DEFAULT 0			
	training_sessions_completed	INTEGER	DEFAULT 0			
	battles_participated	INTEGER	DEFAULT 0			
	battles_won	INTEGER	DEFAULT 0			
	total_damage_dealt	INTEGER	DEFAULT 0			
	total_damage_taken	INTEGER	DEFAULT 0			
	total_healing_given	INTEGER	DEFAULT 0			
	critical_hits	INTEGER	DEFAULT 0			
	abilities_used	INTEGER	DEFAULT 0			
	successful_hits	INTEGER	DEFAULT 0			
	strategy_deviations	INTEGER	DEFAULT 0			
	teamplay_actions	INTEGER	DEFAULT 0			
	relationship_modifiers	JSONB	DEFAULT '[]'			
	acquired_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	acquired_from	VARCHAR(50)				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	is_active	BOOLEAN	DEFAULT TRUE			
	last_battle_at	TIMESTAMP				
	current_training	INTEGER	DEFAULT 75, CHECK BETWEEN 0 AND 100			
	current_team_player	INTEGER	DEFAULT 70, CHECK BETWEEN 0 AND 100			
	current_ego	INTEGER	DEFAULT 60, CHECK BETWEEN 0 AND 100			
	current_communication	INTEGER	DEFAULT 80, CHECK BETWEEN 0 AND 100			
	stress_level	INTEGER	DEFAULT 0, CHECK BETWEEN 0 AND 100			
	fatigue_level	INTEGER	DEFAULT 0, CHECK BETWEEN 0 AND 100			
	morale	INTEGER	DEFAULT 80, CHECK BETWEEN 0 AND 100			
	is_dead	BOOLEAN	DEFAULT false			
	resurrection_available_at	TIMESTAMP				
	serial_number	VARCHAR(20)				
	nickname	VARCHAR(100)	DEFAULT 'New Character'			
	max_health	INTEGER				
	is_injured	BOOLEAN	DEFAULT false			
	equipment	JSONB	DEFAULT '[]'			
	enhancements	JSONB	DEFAULT '[]'			
	conversation_memory	JSONB	DEFAULT '[]'			
	significant_memories	JSONB	DEFAULT '[]'			
	personality_drift	JSONB	DEFAULT '{}'			
	wallet	INTEGER	DEFAULT 0, CHECK >= 0			
	financial_stress	INTEGER	DEFAULT 0, CHECK >= 0			
	coach_trust_level	INTEGER	DEFAULT 0, CHECK >= 0			
	starter_gear_given	BOOLEAN	DEFAULT FALSE			
	level_bonus_attack	INTEGER	DEFAULT 0, CHECK >= 0			
	level_bonus_defense	INTEGER	DEFAULT 0, CHECK >= 0			
	level_bonus_speed	INTEGER	DEFAULT 0, CHECK >= 0			
	level_bonus_max_health	INTEGER	DEFAULT 0, CHECK >= 0			
	level_bonus_special	INTEGER	DEFAULT 0, CHECK >= 0			
	financial_personality	JSONB				
	psychstats	JSONB	(Added via ALTER TABLE)			
	(Constraint)		UNIQUE (user_id, character_id)			
battles	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	player_user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	opponent_user_id	UUID	FOREIGN KEY -> users(id)			
	battle_type	VARCHAR(50)	NOT NULL			
	tournament_id	UUID	(Implied FK to tournaments(id))			
	status	battle_status ENUM	DEFAULT 'matchmaking'			
	phase	battle_phase ENUM	DEFAULT 'pre_battle_huddle'			
	current_round	INTEGER	DEFAULT 1			
	max_rounds	INTEGER	DEFAULT 10			
	player_team_data	JSONB	NOT NULL			
	opponent_team_data	JSONB	NOT NULL			
	battle_log	JSONB	DEFAULT '[]'			
	round_results	JSONB	DEFAULT '[]'			
	coaching_data	JSONB	DEFAULT '{}'			
	winner_user_id	UUID	FOREIGN KEY -> users(id)			
	battle_result	VARCHAR(20)				
	final_score	JSONB				
	ai_judge_context	JSONB	DEFAULT '{}'			
	ai_commentary	TEXT				
	global_morale	JSONB	DEFAULT '{"player": 50, "opponent": 50}'			
	started_at	TIMESTAMP				
	ended_at	TIMESTAMP				
	total_duration_seconds	INTEGER				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
battle_queue	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	queue_type	VARCHAR(50)	NOT NULL			
	preferred_strategy	battle_strategy ENUM				
	team_composition	JSONB	NOT NULL			
	min_opponent_level	INTEGER				
	max_opponent_level	INTEGER				
	estimated_wait_time	INTEGER				
	status	VARCHAR(20)	DEFAULT 'waiting'			
	matched_battle_id	UUID	FOREIGN KEY -> battles(id)			
	joined_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	matched_at	TIMESTAMP				
	expires_at	TIMESTAMP	DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')			
equipment	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	name	VARCHAR(100)	NOT NULL			
	type	VARCHAR(50)	NOT NULL			
	subtype	VARCHAR(50)				
	rarity	character_rarity ENUM	NOT NULL			
	stat_modifiers	JSONB	DEFAULT '{}'			
	special_abilities	JSONB	DEFAULT '[]'			
	required_level	INTEGER	DEFAULT 1			
	required_archetype	JSONB				
	required_character_ids	JSONB				
	description	TEXT				
	flavor_text	TEXT				
	icon	VARCHAR(255)				
	artwork	JSONB	DEFAULT '{}'			
	durability	INTEGER	DEFAULT 100			
	upgrade_slots	INTEGER	DEFAULT 0			
	is_craftable	BOOLEAN	DEFAULT FALSE			
	craft_materials	JSONB	DEFAULT '[]'			
	drop_sources	JSONB	DEFAULT '[]'			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	is_active	BOOLEAN	DEFAULT TRUE			
user_equipment	id	UUID or TEXT	PRIMARY KEY (Note: Conflicting definitions exist in logs)			
	user_id	UUID or TEXT	NOT NULL, FOREIGN KEY -> users(id)			
	equipment_id	UUID or TEXT	NOT NULL, FOREIGN KEY -> equipment(id)			
	current_level	INTEGER	DEFAULT 1, CHECK >= 1			
	current_durability	INTEGER	DEFAULT 100			
	enhancement_level	INTEGER	DEFAULT 0			
	applied_upgrades	JSONB	DEFAULT '[]'			
	custom_stats	JSONB or TEXT	DEFAULT '{}'			
	is_equipped	BOOLEAN	DEFAULT FALSE			
	equipped_to_character_id	UUID or TEXT	(Implied FK to user_characters(id))			
	acquired_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	acquired_from	VARCHAR(50)				
	purchase_price	INTEGER	(From user_equipment_schema.sql)			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
chat_messages	id	UUID or TEXT	PRIMARY KEY (Note: Two different schemas exist for this table in the logs)			
	(Schema 1)		From 003_social_and_economy.sql			
	user_id	UUID	FOREIGN KEY -> users(id)			
	source	event_source ENUM	NOT NULL			
	context_id	VARCHAR(100)				
	content	TEXT	NOT NULL			
	message_type	VARCHAR(50)	DEFAULT 'user'			
	ai_agent_type	VARCHAR(50)				
	ai_context	JSONB	DEFAULT '{}'			
	character_context	JSONB	DEFAULT '{}'			
	is_pinned	BOOLEAN	DEFAULT FALSE			
	is_hidden	BOOLEAN	DEFAULT FALSE			
	sentiment_score	DECIMAL(3,2)				
	parent_message_id	UUID	FOREIGN KEY -> chat_messages(id)			
	thread_depth	INTEGER	DEFAULT 0			
	reactions	JSONB	DEFAULT '{}'			
	upvotes	INTEGER	DEFAULT 0			
	downvotes	INTEGER	DEFAULT 0			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	edited_at	TIMESTAMP				
	(Schema 2)		From 005_embedded_schema_consolidation.sql			
	user_id	TEXT	NOT NULL, FOREIGN KEY -> users(id)			
	character_id	TEXT	NOT NULL, FOREIGN KEY -> user_characters(id)			
	battle_id	TEXT	FOREIGN KEY -> battles(id)			
	player_message	TEXT	NOT NULL			
	character_response	TEXT	NOT NULL			
	message_context	JSONB				
	model_used	TEXT				
	tokens_used	INTEGER				
	response_time_ms	INTEGER				
	bond_increase	BOOLEAN	DEFAULT FALSE			
	memory_saved	BOOLEAN	DEFAULT FALSE			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
card_packs	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	name	VARCHAR(100)	NOT NULL			
	description	TEXT				
	pack_type	VARCHAR(50)	NOT NULL			
	guaranteed_contents	JSONB	DEFAULT '[]'			
	possible_contents	JSONB	DEFAULT '[]'			
	total_cards	INTEGER	DEFAULT 5			
	rarity_weights	JSONB	DEFAULT '{}'			
	cost_credits	INTEGER	DEFAULT 0			
	cost_real_money	DECIMAL(10,2)	DEFAULT 0.00			
	is_purchasable	BOOLEAN	DEFAULT TRUE			
	requires_level	INTEGER	DEFAULT 1			
	available_from	TIMESTAMP				
	available_until	TIMESTAMP				
	max_purchases_per_user	INTEGER				
	pack_artwork	VARCHAR(255)				
	pack_animation	VARCHAR(255)				
	rarity_colors	JSONB	DEFAULT '{}'			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	is_active	BOOLEAN	DEFAULT TRUE			
qr_codes	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	code	VARCHAR(255)	UNIQUE, NOT NULL			
	pack_template_id	UUID	NOT NULL, FOREIGN KEY -> card_packs(id)			
	is_used	BOOLEAN	DEFAULT FALSE			
	used_by_user_id	UUID	FOREIGN KEY -> users(id)			
	used_at	TIMESTAMP				
	batch_id	VARCHAR(100)				
	expiration_date	DATE				
	region	VARCHAR(10)				
	validation_hash	VARCHAR(255)				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	manufacturer_id	VARCHAR(100)				
claimable_packs	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	pack_template_id	UUID	NOT NULL, FOREIGN KEY -> card_packs(id)			
	is_claimed	BOOLEAN	DEFAULT FALSE			
	claimed_at	TIMESTAMP				
	source	VARCHAR(100)	NOT NULL			
	reason	TEXT				
	expires_at	TIMESTAMP				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	pack_type	VARCHAR(50)				
	claimed_by_user_id	UUID	FOREIGN KEY -> users(id)			
claimable_pack_contents	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	claimable_pack_id	UUID	NOT NULL, FOREIGN KEY -> claimable_packs(id)			
	character_id	VARCHAR(50)	NOT NULL, FOREIGN KEY -> characters(id)			
	rarity	character_rarity ENUM	NOT NULL			
	bonus_experience	INTEGER	DEFAULT 0			
	bonus_bond_levels	INTEGER	DEFAULT 0			
	reveal_order	INTEGER	DEFAULT 1			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
user_currency	user_id	UUID	PRIMARY KEY, FOREIGN KEY -> users(id) (Note: Two different schemas exist)			
	(Schema 1)		From 003_social_and_economy.sql			
	credits	INTEGER	DEFAULT 1000, CHECK >= 0			
	premium_gems	INTEGER	DEFAULT 0, CHECK >= 0			
	battle_tokens	INTEGER	DEFAULT 0, CHECK >= 0			
	training_points	INTEGER	DEFAULT 0, CHECK >= 0			
	last_updated	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Schema 2)		From 005... & 012... .sql files			
	battle_tokens	INTEGER	DEFAULT 100, CHECK >= 0			
	premium_currency	INTEGER	DEFAULT 0, CHECK >= 0			
	daily_earnings	INTEGER	DEFAULT 0, CHECK >= 0			
	weekly_earnings	INTEGER	DEFAULT 0, CHECK >= 0			
	monthly_earnings	INTEGER	DEFAULT 0, CHECK >= 0			
	total_lifetime_earnings	BIGINT	DEFAULT 0, CHECK >= 0			
	last_updated	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	coins	INTEGER	DEFAULT 1000, CHECK >= 0			
user_friendships	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	requester_user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	addressee_user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	status	VARCHAR(20)	DEFAULT 'pending'			
	battles_together	INTEGER	DEFAULT 0			
	last_interaction	TIMESTAMP				
	friendship_level	INTEGER	DEFAULT 1, CHECK >= 1 AND <= 10			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Constraints)		UNIQUE (requester_user_id, addressee_user_id)			
			CHECK (requester_user_id != addressee_user_id)			
purchases	id	UUID	PRIMARY KEY (Note: Two different schemas exist)			
	(Schema 1)		From 003_social_and_economy.sql			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	item_type	VARCHAR(50)	NOT NULL			
	item_id	VARCHAR(100)				
	quantity	INTEGER	DEFAULT 1			
	cost_credits	INTEGER	DEFAULT 0			
	cost_premium_gems	INTEGER	DEFAULT 0			
	cost_real_money	DECIMAL(10,2)	DEFAULT 0.00			
	currency_type	VARCHAR(20)				
	stripe_payment_intent_id	VARCHAR(255)				
	payment_status	VARCHAR(20)	DEFAULT 'pending'			
	payment_method	VARCHAR(50)				
	is_fulfilled	BOOLEAN	DEFAULT FALSE			
	fulfilled_at	TIMESTAMP				
	fulfillment_data	JSONB	DEFAULT '{}'			
	refund_amount	DECIMAL(10,2)	DEFAULT 0.00			
	refunded_at	TIMESTAMP				
	refund_reason	TEXT				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Schema 2)		From 012_add_user_items_table.sql			
	id	UUID	PRIMARY KEY, DEFAULT gen_random_uuid()			
	user_id	TEXT	NOT NULL, FOREIGN KEY -> users(id)			
	item_type	TEXT	NOT NULL			
	item_id	TEXT	NOT NULL			
	quantity	INTEGER	NOT NULL, DEFAULT 1, CHECK > 0			
	cost_coins	INTEGER	DEFAULT 0, CHECK >= 0			
	cost_battle_tokens	INTEGER	DEFAULT 0, CHECK >= 0			
	cost_premium_currency	INTEGER	DEFAULT 0, CHECK >= 0			
	transaction_status	TEXT	DEFAULT 'completed', CHECK IN ('pending', 'completed', 'failed', 'refunded')			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	completed_at	TIMESTAMP				
	notes	TEXT				
tournaments	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	name	VARCHAR(200)	NOT NULL			
	description	TEXT				
	format	tournament_format ENUM	NOT NULL			
	status	tournament_status ENUM	DEFAULT 'upcoming'			
	max_participants	INTEGER	NOT NULL			
	min_participants	INTEGER	DEFAULT 2			
	entry_fee_credits	INTEGER	DEFAULT 0			
	entry_fee_gems	INTEGER	DEFAULT 0			
	required_level	INTEGER	DEFAULT 1			
	required_characters	INTEGER	DEFAULT 3			
	registration_opens_at	TIMESTAMP	NOT NULL			
	registration_closes_at	TIMESTAMP	NOT NULL			
	tournament_starts_at	TIMESTAMP	NOT NULL			
	tournament_ends_at	TIMESTAMP				
	current_round	INTEGER	DEFAULT 1			
	total_rounds	INTEGER				
	bracket_data	JSONB	DEFAULT '{}'			
	prize_pool	JSONB	DEFAULT '{}'			
	sponsor_data	JSONB	DEFAULT '{}'			
	team_size	INTEGER	DEFAULT 3			
	character_restrictions	JSONB	DEFAULT '[]'			
	special_rules	JSONB	DEFAULT '{}'			
	organizer_user_id	UUID	FOREIGN KEY -> users(id)			
	is_official	BOOLEAN	DEFAULT FALSE			
	moderation_notes	TEXT				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
tournament_participants	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	tournament_id	UUID	NOT NULL, FOREIGN KEY -> tournaments(id)			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	registered_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	team_composition	JSONB	NOT NULL			
	team_name	VARCHAR(100)				
	current_round	INTEGER	DEFAULT 1			
	is_eliminated	BOOLEAN	DEFAULT FALSE			
	eliminated_at	TIMESTAMP				
	eliminated_by_user_id	UUID	FOREIGN KEY -> users(id)			
	wins	INTEGER	DEFAULT 0			
	losses	INTEGER	DEFAULT 0			
	total_battles	INTEGER	DEFAULT 0			
	points	INTEGER	DEFAULT 0			
	final_placement	INTEGER				
	rewards_claimed	BOOLEAN	DEFAULT FALSE			
	rewards_data	JSONB	DEFAULT '{}'			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Constraint)		UNIQUE (tournament_id, user_id)			
analytics_events	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	FOREIGN KEY -> users(id)			
	session_id	VARCHAR(255)				
	event_type	VARCHAR(100)	NOT NULL			
	event_category	VARCHAR(50)				
	event_source	VARCHAR(100)				
	event_data	JSONB	DEFAULT '{}'			
	event_value	DECIMAL(10,2)				
	character_context	VARCHAR(50)				
	battle_context	UUID				
	device_info	JSONB	DEFAULT '{}'			
	country_code	VARCHAR(2)				
	region	VARCHAR(50)				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	event_timestamp	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	experiment_variant	VARCHAR(50)				
	experiment_id	VARCHAR(100)				
user_character_echoes	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	character_id	VARCHAR(50)	NOT NULL, FOREIGN KEY -> characters(id)			
	echo_count	INTEGER	DEFAULT 0, CHECK >= 0			
	total_echoes_ever	INTEGER	DEFAULT 0			
	last_conversion_at	TIMESTAMP				
	total_converted_to_currency	INTEGER	DEFAULT 0			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Constraint)		UNIQUE (user_id, character_id)			
training_sessions	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	character_id	UUID	NOT NULL, FOREIGN KEY -> user_characters(id)			
	training_type	VARCHAR(50)	NOT NULL			
	training_activity	VARCHAR(100)	NOT NULL			
	duration_minutes	INTEGER	NOT NULL			
	experience_gained	INTEGER	DEFAULT 0			
	skill_points_gained	INTEGER	DEFAULT 0			
	stat_improvements	JSONB	DEFAULT '{}'			
	training_quality	DECIMAL(3,2)	DEFAULT 1.00			
	trainer_type	VARCHAR(50)				
	trainer_id	VARCHAR(100)				
	training_context	JSONB	DEFAULT '{}'			
	pre_training_stats	JSONB	DEFAULT '{}'			
	post_training_stats	JSONB	DEFAULT '{}'			
	is_completed	BOOLEAN	DEFAULT FALSE			
	completed_at	TIMESTAMP				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	started_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
character_conflicts	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	character1_id	UUID	NOT NULL, FOREIGN KEY -> user_characters(id)			
	character2_id	UUID	NOT NULL, FOREIGN KEY -> user_characters(id)			
	conflict_type	VARCHAR(50)	NOT NULL			
	severity	INTEGER	DEFAULT 1, CHECK >= 1 AND <= 10			
	description	TEXT				
	trigger_event	VARCHAR(100)				
	battle_context	UUID				
	training_context	UUID				
	is_resolved	BOOLEAN	DEFAULT FALSE			
	resolution_method	VARCHAR(50)				
	resolved_at	TIMESTAMP				
	resolution_notes	TEXT				
	relationship_impact	INTEGER	DEFAULT 0			
	team_chemistry_impact	INTEGER	DEFAULT 0			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Constraint)		CHECK (character1_id != character2_id)			
therapy_sessions	id	UUID	PRIMARY KEY, DEFAULT uuid_generate_v4()			
	user_id	UUID	NOT NULL, FOREIGN KEY -> users(id)			
	target_character_ids	JSONB	NOT NULL			
	conflict_id	UUID	FOREIGN KEY -> character_conflicts(id)			
	session_type	VARCHAR(50)	NOT NULL			
	therapist_type	VARCHAR(50)	DEFAULT 'ai'			
	duration_minutes	INTEGER	DEFAULT 30			
	session_transcript	JSONB	DEFAULT '[]'			
	therapy_goals	JSONB	DEFAULT '[]'			
	techniques_used	JSONB	DEFAULT '[]'			
	mental_health_improvements	JSONB	DEFAULT '{}'			
	relationship_improvements	JSONB	DEFAULT '{}'			
	behavioral_changes	JSONB	DEFAULT '{}'			
	session_effectiveness	DECIMAL(3,2)	DEFAULT 0.50			
	participant_satisfaction	JSONB	DEFAULT '{}'			
	follow_up_required	BOOLEAN	DEFAULT FALSE			
	follow_up_scheduled_at	TIMESTAMP				
	homework_assigned	JSONB	DEFAULT '[]'			
	is_completed	BOOLEAN	DEFAULT FALSE			
	completed_at	TIMESTAMP				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	started_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
user_headquarters	id	UUID	PRIMARY KEY, DEFAULT gen_random_uuid()			
	user_id	UUID	UNIQUE, NOT NULL, FOREIGN KEY -> users(id)			
	tier_id	TEXT	DEFAULT 'spartan_apartment', CHECK IN ('spartan_apartment', 'luxury_suite', 'team_compound', 'fortress_headquarters')			
	coins	INTEGER	DEFAULT 50000, CHECK >= 0			
	gems	INTEGER	DEFAULT 100, CHECK >= 0			
	unlocked_themes	JSONB	DEFAULT '[]'			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
headquarters_rooms	id	UUID	PRIMARY KEY, DEFAULT gen_random_uuid()			
	headquarters_id	UUID	NOT NULL, FOREIGN KEY -> user_headquarters(id)			
	room_id	TEXT	NOT NULL			
	room_type	TEXT	NOT NULL, CHECK IN ('bedroom', 'kitchen', 'training_room', 'lounge', 'office', 'storage', 'medical_bay', 'trophy_room', 'library', 'workshop')			
	capacity	INTEGER	DEFAULT 2, CHECK > 0			
	occupied_slots	INTEGER	DEFAULT 0, CHECK >= 0			
	theme	TEXT	DEFAULT 'default'			
	furniture	JSONB	DEFAULT '[]'			
	position_x	INTEGER	DEFAULT 0			
	position_y	INTEGER	DEFAULT 0			
	width	INTEGER	DEFAULT 1, CHECK > 0			
	height	INTEGER	DEFAULT 1, CHECK > 0			
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Constraints)		valid_occupancy CHECK (occupied_slots <= capacity)			
			valid_room_size CHECK (width > 0 AND height > 0 AND width <= 10 AND height <= 10)			
room_beds	id	UUID	PRIMARY KEY, DEFAULT gen_random_uuid()			
	room_id	UUID	NOT NULL, FOREIGN KEY -> headquarters_rooms(id)			
	character_id	UUID	FOREIGN KEY -> user_characters(id), UNIQUE			
	bed_position	INTEGER	NOT NULL, CHECK > 0			
	comfort_level	INTEGER	DEFAULT 50, CHECK BETWEEN 0 AND 100			
	last_used	TIMESTAMP				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	(Constraints)		UNIQUE (room_id, bed_position)			
			valid_comfort CHECK (comfort_level BETWEEN 0 AND 100)			
healing_facilities	id	VARCHAR(50)	PRIMARY KEY			
	name	VARCHAR(100)	NOT NULL			
	facility_type	VARCHAR(50)	NOT NULL			
	healing_rate_multiplier	DECIMAL(3,1)	NOT NULL, DEFAULT 1.0			
	currency_cost_per_hour	INTEGER	NOT NULL, DEFAULT 0			
	premium_cost_per_hour	INTEGER	NOT NULL, DEFAULT 0			
	max_injury_severity	VARCHAR(20)	NOT NULL			
	headquarters_tier_required	VARCHAR(50)	NOT NULL			
	description	TEXT				
	created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	updated_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP			
	is_active	BOOLEAN	DEFAULT TRUE			
cron_logs	id	SERIAL	PRIMARY KEY			
	job_type	VARCHAR(50)	NOT NULL			
	success_count	INTEGER	NOT NULL, DEFAULT 0			
	error_count	INTEGER	NOT NULL, DEFAULT 0			
	duration_ms	INTEGER	NOT NULL			
	description	TEXT				
	metadata	JSONB				
	error_message	TEXT				
	executed_at	TIMESTAMP WITH TIME ZONE	DEFAULT NOW()			
	created_at	TIMESTAMP WITH TIME ZONE	DEFAULT NOW()			