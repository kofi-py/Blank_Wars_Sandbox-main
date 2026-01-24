import { query } from '../database/postgres';

export const HEALING_FACILITIES = [
  {
    id: 'basic_medical_bay',
    name: 'Basic Medical Bay',
    facility_type: 'basic_medical',
    healing_rate_multiplier: 1.5,
    currency_cost_per_hour: 25,
    premium_cost_per_hour: 0,
    max_injury_severity: 'moderate',
    headquarters_tier_required: 'basic_house',
    description: 'Simple medical facility that speeds up recovery by 50%'
  },
  {
    id: 'advanced_medical_center',
    name: 'Advanced Medical Center',
    facility_type: 'advanced_medical',
    healing_rate_multiplier: 2.0,
    currency_cost_per_hour: 50,
    premium_cost_per_hour: 1,
    max_injury_severity: 'severe',
    headquarters_tier_required: 'mansion',
    description: 'Modern medical facility that doubles recovery speed'
  },
  {
    id: 'premium_healing_chamber',
    name: 'Premium Healing Chamber',
    facility_type: 'premium_medical',
    healing_rate_multiplier: 3.0,
    currency_cost_per_hour: 100,
    premium_cost_per_hour: 2,
    max_injury_severity: 'critical',
    headquarters_tier_required: 'compound',
    description: 'State-of-the-art medical pod that triples recovery speed'
  },
  {
    id: 'resurrection_chamber',
    name: 'Resurrection Chamber',
    facility_type: 'resurrection_chamber',
    healing_rate_multiplier: 1.0,
    currency_cost_per_hour: 200,
    premium_cost_per_hour: 5,
    max_injury_severity: 'dead',
    headquarters_tier_required: 'compound',
    description: 'Ancient technology capable of bringing the dead back to life'
  }
];

/**
 * Initialize healing facilities in the database
 */
export async function initializeHealingFacilities(): Promise<void> {
  try {
    console.log('🏥 Initializing healing facilities...');
    
    for (const facility of HEALING_FACILITIES) {
      await query(
        `INSERT INTO healing_facilities 
         (id, name, facility_type, healing_rate_multiplier, currency_cost_per_hour, 
          premium_cost_per_hour, max_injury_severity, headquarters_tier_required, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           facility_type = EXCLUDED.facility_type,
           healing_rate_multiplier = EXCLUDED.healing_rate_multiplier,
           currency_cost_per_hour = EXCLUDED.currency_cost_per_hour,
           premium_cost_per_hour = EXCLUDED.premium_cost_per_hour,
           max_injury_severity = EXCLUDED.max_injury_severity,
           headquarters_tier_required = EXCLUDED.headquarters_tier_required,
           description = EXCLUDED.description`,
        [
          facility.id,
          facility.name,
          facility.facility_type,
          facility.healing_rate_multiplier,
          facility.currency_cost_per_hour,
          facility.premium_cost_per_hour,
          facility.max_injury_severity,
          facility.headquarters_tier_required,
          facility.description
        ]
      );
    }
    
    console.log(`✅ Initialized ${HEALING_FACILITIES.length} healing facilities`);
  } catch (error) {
    console.error('❌ Error initializing healing facilities:', error);
    throw error;
  }
}

/**
 * Get available facilities for a user based on their headquarters tier
 */
export async function getAvailableFacilities(headquarters_tier: string): Promise<any[]> {
  try {
    const tier_hierarchy: Record<string, number> = {
      'your_parents_basement': 0,
      'radioactive_roach_motel': 0,
      'hobo_camp': 0,
      'spartan_apartment': 1,
      'basic_house': 2,
      'condo': 3,
      'mansion': 4,
      'compound': 5,
      'super_yacht': 6,
      'moon_base': 7
    };
    
    const user_tier_level = tier_hierarchy[headquarters_tier] || 0;

    const result = await query(
      `SELECT * FROM healing_facilities
       WHERE headquarters_tier_required IS NULL
       OR headquarters_tier_required = ANY($1)
       ORDER BY healing_rate_multiplier ASC`,
      [Object.keys(tier_hierarchy).filter(tier =>
        tier_hierarchy[tier] <= user_tier_level
      )]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting available facilities:', error);
    return [];
  }
}
