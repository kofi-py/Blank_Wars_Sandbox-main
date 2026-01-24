-- Migration 304: Team Member Experience Tracking
-- Tracks system character/mascot experience PER TEAM
-- Enables team-specific bonuses based on time/events together

BEGIN;

CREATE TABLE team_member_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

    -- Generic event counter
    events_participated INTEGER DEFAULT 0,

    -- Role-specific counters (null for non-applicable roles)
    battles_judged INTEGER DEFAULT 0,
    therapy_sessions INTEGER DEFAULT 0,
    training_sessions_led INTEGER DEFAULT 0,
    shows_hosted INTEGER DEFAULT 0,
    properties_managed INTEGER DEFAULT 0,
    mascot_events INTEGER DEFAULT 0,

    -- Calculated tier
    experience_tier TEXT DEFAULT 'rookie'
        CHECK (experience_tier IN ('rookie', 'experienced', 'veteran', 'legend')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_char_per_team UNIQUE (team_id, user_character_id)
);

CREATE INDEX idx_tme_team_id ON team_member_experience(team_id);
CREATE INDEX idx_tme_user_character ON team_member_experience(user_character_id);
CREATE INDEX idx_tme_experience_tier ON team_member_experience(experience_tier);

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (304, '304_team_member_experience')
ON CONFLICT (version) DO NOTHING;
