"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresAdapter = void 0;
const pg_1 = require("pg");
/**
 * PostgreSQL adapter for persistent event and memory storage
 */
class PostgresAdapter {
    constructor(connectionString) {
        this.pool = new pg_1.Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    // IEventStore Implementation
    async saveEvent(event) {
        const query = `
      INSERT INTO game_events (
        id, type, timestamp, severity, description,
        character_ids, metadata, scene_relevance,
        emotional_weight, conflict_potential, comedy_potential,
        quotable_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        scene_relevance = EXCLUDED.scene_relevance
    `;
        await this.pool.query(query, [
            event.id,
            event.type,
            event.timestamp,
            event.severity,
            event.description,
            event.characterIds,
            JSON.stringify(event.metadata),
            JSON.stringify(event.sceneRelevance),
            event.emotionalWeight,
            event.conflictPotential,
            event.comedyPotential,
            event.quotableScore
        ]);
    }
    async getById(id) {
        const query = `SELECT * FROM game_events WHERE id = $1`;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0)
            return null;
        return this.mapRowToEvent(result.rows[0]);
    }
    async getRecent(characterId, hours) {
        const query = `
      SELECT * FROM game_events 
      WHERE $1 = ANY(character_ids)
      AND timestamp > NOW() - INTERVAL '${hours} hours'
      ORDER BY timestamp DESC
      LIMIT 50
    `;
        const result = await this.pool.query(query, [characterId]);
        return result.rows.map(row => this.mapRowToEvent(row));
    }
    // IMemoryStore Implementation
    async saveMemory(memory) {
        const query = `
      INSERT INTO character_memories (
        id, character_id, event_id, summary, detailed_content,
        emotional_feeling, emotional_intensity, emotional_valence,
        importance, decay, last_recalled, recall_count,
        involved_characters, relationship_impact, best_used_in,
        trigger_keywords
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        decay = EXCLUDED.decay,
        last_recalled = EXCLUDED.last_recalled,
        recall_count = EXCLUDED.recall_count
    `;
        await this.pool.query(query, [
            memory.id,
            memory.characterId,
            memory.eventId,
            memory.summary,
            memory.detailedContent,
            memory.emotionalContext.feeling,
            memory.emotionalContext.intensity,
            memory.emotionalContext.valence,
            memory.importance,
            memory.decay,
            memory.lastRecalled,
            memory.recallCount,
            memory.involvedCharacters,
            JSON.stringify(memory.relationshipImpact),
            memory.bestUsedIn,
            memory.triggerKeywords
        ]);
    }
    async getByCharacter(characterId, limit) {
        const query = `
      SELECT * FROM character_memories 
      WHERE character_id = $1
      AND decay < 90  -- Filter out heavily decayed memories
      ORDER BY importance DESC, last_recalled DESC
      LIMIT ${limit || 200}
    `;
        const result = await this.pool.query(query, [characterId]);
        return result.rows.map(row => this.mapRowToMemory(row));
    }
    async getByEvent(eventId) {
        const query = `
      SELECT * FROM character_memories 
      WHERE event_id = $1
      ORDER BY importance DESC
    `;
        const result = await this.pool.query(query, [eventId]);
        return result.rows.map(row => this.mapRowToMemory(row));
    }
    async updateRecall(memoryId) {
        const query = `
      UPDATE character_memories 
      SET 
        last_recalled = NOW(),
        recall_count = recall_count + 1,
        decay = GREATEST(0, decay - 5)  -- Recalling reduces decay
      WHERE id = $1
    `;
        await this.pool.query(query, [memoryId]);
    }
    // IRelationshipStore Implementation  
    async saveRelationship(relationship) {
        const query = `
      INSERT INTO character_relationships (
        character_id, target_id, trust_level, respect_level, 
        affection_level, trajectory, last_interaction, interaction_count
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 1)
      ON CONFLICT (character_id, target_id) DO UPDATE SET
        trust_level = EXCLUDED.trust_level,
        respect_level = EXCLUDED.respect_level,
        affection_level = EXCLUDED.affection_level,
        trajectory = EXCLUDED.trajectory,
        last_interaction = NOW(),
        interaction_count = character_relationships.interaction_count + 1
    `;
        await this.pool.query(query, [
            relationship.characterId,
            relationship.targetId,
            relationship.trust,
            relationship.respect,
            relationship.affection,
            relationship.trajectory
        ]);
    }
    async get(characterId, targetId) {
        const query = `
      SELECT r.*, 
        array_agg(DISTINCT re.event_id) as history_events,
        array_agg(DISTINCT c.conflict_id) FILTER (WHERE c.resolved = false) as tension_points
      FROM character_relationships r
      LEFT JOIN relationship_events re ON 
        re.character_id = r.character_id AND re.target_id = r.target_id
      LEFT JOIN relationship_conflicts c ON 
        c.character_id = r.character_id AND c.target_id = r.target_id
      WHERE r.character_id = $1 AND r.target_id = $2
      GROUP BY r.character_id, r.target_id
    `;
        const result = await this.pool.query(query, [characterId, targetId]);
        if (result.rows.length === 0)
            return null;
        return this.mapRowToRelationship(result.rows[0]);
    }
    async getForCharacter(characterId) {
        const query = `
      SELECT r.*, 
        array_agg(DISTINCT re.event_id) as history_events,
        array_agg(DISTINCT c.conflict_id) FILTER (WHERE c.resolved = false) as tension_points
      FROM character_relationships r
      LEFT JOIN relationship_events re ON 
        re.character_id = r.character_id AND re.target_id = r.target_id
      LEFT JOIN relationship_conflicts c ON 
        c.character_id = r.character_id AND c.target_id = r.target_id
      WHERE r.character_id = $1
      GROUP BY r.character_id, r.target_id
      ORDER BY r.last_interaction DESC
    `;
        const result = await this.pool.query(query, [characterId]);
        return result.rows.map(row => this.mapRowToRelationship(row));
    }
    // Additional helper method for relationship updates
    async updateRelationship(characterId, targetId, changes) {
        const query = `
      INSERT INTO character_relationships (
        character_id, target_id, trust_level, respect_level, 
        affection_level, last_interaction, interaction_count
      ) VALUES ($1, $2, $3, $4, $5, NOW(), 1)
      ON CONFLICT (character_id, target_id) DO UPDATE SET
        trust_level = GREATEST(-100, LEAST(100, 
          character_relationships.trust_level + EXCLUDED.trust_level)),
        respect_level = GREATEST(-100, LEAST(100, 
          character_relationships.respect_level + EXCLUDED.respect_level)),
        affection_level = GREATEST(-100, LEAST(100, 
          character_relationships.affection_level + EXCLUDED.affection_level)),
        last_interaction = NOW(),
        interaction_count = character_relationships.interaction_count + 1
    `;
        await this.pool.query(query, [
            characterId,
            targetId,
            changes.trust,
            changes.respect,
            changes.affection
        ]);
        // Update trajectory based on recent changes
        await this.updateRelationshipTrajectory(characterId, targetId);
    }
    // Additional memory query methods
    async getMemoriesForScene(characterId, sceneType, otherCharacters) {
        const query = `
      SELECT m.* FROM character_memories m
      WHERE m.character_id = $1
      AND m.decay < 70
      AND (
        -- High relevance for this scene
        (m.scene_relevance->$2)::numeric > 50
        OR
        -- Involves other characters in scene
        m.involved_characters && $3
        OR
        -- Recent and important
        (m.last_recalled > NOW() - INTERVAL '24 hours' AND m.importance > 60)
      )
      ORDER BY 
        (m.scene_relevance->$2)::numeric DESC,
        m.importance DESC,
        m.last_recalled DESC
      LIMIT 20
    `;
        const result = await this.pool.query(query, [
            characterId,
            sceneType,
            otherCharacters
        ]);
        return result.rows.map(row => this.mapRowToMemory(row));
    }
    async getEmotionalState(characterId) {
        // Calculate emotional state from recent events and memories
        const query = `
      WITH recent_events AS (
        SELECT 
          emotional_intensity,
          emotional_valence,
          emotional_feeling
        FROM character_memories
        WHERE character_id = $1
        AND last_recalled > NOW() - INTERVAL '48 hours'
        AND decay < 50
        ORDER BY last_recalled DESC
        LIMIT 10
      ),
      active_conflicts AS (
        SELECT conflict_id, severity
        FROM relationship_conflicts
        WHERE (character_id = $1 OR target_id = $1)
        AND resolved = false
      )
      SELECT 
        COALESCE(AVG(CASE 
          WHEN emotional_valence = 'negative' THEN emotional_intensity 
          ELSE 0 
        END), 30) as stress,
        COALESCE(AVG(CASE 
          WHEN emotional_valence = 'positive' THEN emotional_intensity 
          ELSE 100 - emotional_intensity 
        END), 50) as confidence,
        array_agg(DISTINCT conflict_id) as active_conflicts
      FROM recent_events, active_conflicts
    `;
        const result = await this.pool.query(query, [characterId]);
        const row = result.rows[0];
        return {
            stress: Math.round(row.stress || 30),
            confidence: Math.round(row.confidence || 50),
            currentMood: this.calculateMood(row.stress, row.confidence),
            activeConflicts: row.active_conflicts || []
        };
    }
    // Helper methods
    mapRowToEvent(row) {
        return {
            id: row.id,
            type: row.type,
            timestamp: new Date(row.timestamp),
            severity: row.severity,
            description: row.description,
            characterIds: row.character_ids,
            metadata: row.metadata,
            sceneRelevance: row.scene_relevance,
            emotionalWeight: row.emotional_weight,
            conflictPotential: row.conflict_potential,
            comedyPotential: row.comedy_potential,
            quotableScore: row.quotable_score
        };
    }
    mapRowToMemory(row) {
        return {
            id: row.id,
            characterId: row.character_id,
            eventId: row.event_id,
            summary: row.summary,
            detailedContent: row.detailed_content,
            emotionalContext: {
                feeling: row.emotional_feeling,
                intensity: row.emotional_intensity,
                valence: row.emotional_valence
            },
            importance: row.importance,
            decay: row.decay,
            lastRecalled: new Date(row.last_recalled),
            recallCount: row.recall_count,
            involvedCharacters: row.involved_characters,
            relationshipImpact: row.relationship_impact,
            bestUsedIn: row.best_used_in,
            triggerKeywords: row.trigger_keywords
        };
    }
    mapRowToRelationship(row) {
        return {
            characterId: row.character_id,
            targetId: row.target_id,
            trust: row.trust_level,
            respect: row.respect_level,
            affection: row.affection_level,
            history: row.history_events || [],
            trajectory: row.trajectory,
            tensionPoints: row.tension_points || []
        };
    }
    async updateRelationshipTrajectory(characterId, targetId) {
        // Calculate trajectory based on recent interaction history
        const query = `
      WITH recent_changes AS (
        SELECT 
          SUM(trust_delta) as trust_trend,
          SUM(respect_delta) as respect_trend
        FROM relationship_history
        WHERE character_id = $1 AND target_id = $2
        AND timestamp > NOW() - INTERVAL '7 days'
      )
      UPDATE character_relationships
      SET trajectory = CASE
        WHEN trust_trend > 10 OR respect_trend > 10 THEN 'improving'
        WHEN trust_trend < -10 OR respect_trend < -10 THEN 'declining'
        WHEN ABS(trust_trend) > 20 OR ABS(respect_trend) > 20 THEN 'volatile'
        ELSE 'stable'
      END
      FROM recent_changes
      WHERE character_id = $1 AND target_id = $2
    `;
        await this.pool.query(query, [characterId, targetId]);
    }
    calculateMood(stress, confidence) {
        if (stress > 70)
            return 'anxious';
        if (stress > 50 && confidence < 40)
            return 'worried';
        if (confidence > 70)
            return 'confident';
        if (confidence < 30)
            return 'insecure';
        return 'neutral';
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgresAdapter = PostgresAdapter;
