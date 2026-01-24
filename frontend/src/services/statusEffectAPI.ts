/**
 * Status Effect System API Service
 * Handles fetching status effect types from database with caching
 */

const API_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set. Cannot initialize statusEffectAPI.');
  }
  return url;
})();

export interface StatusEffectType {
  id: string;
  name: string;
  category: 'cc' | 'buff' | 'debuff' | 'dot' | 'hot';
  description: string;
  icon: string;
  stackable: boolean;
  cc_diminishing: boolean;
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'neutral';
  description: string;
  value: number;
  duration: number;
  stackable: boolean;
}

// In-memory cache for status effects (loaded once per session)
let statusEffectCache: Map<string, StatusEffectType> | null = null;

/**
 * Fetch all status effect types from database
 */
async function fetchStatusEffects(): Promise<Map<string, StatusEffectType>> {
  const response = await fetch(`${API_BASE}/api/battles/status-effects`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status effects: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch status effects');
  }

  const effectMap = new Map<string, StatusEffectType>();
  for (const effect of data.status_effects) {
    effectMap.set(effect.id, effect);
  }

  return effectMap;
}

/**
 * Get status effect types from cache or database
 */
export async function getStatusEffectTypes(): Promise<Map<string, StatusEffectType>> {
  if (!statusEffectCache) {
    statusEffectCache = await fetchStatusEffects();
  }
  return statusEffectCache;
}

/**
 * Map category to StatusEffect type
 */
function mapCategoryToType(category: 'cc' | 'buff' | 'debuff' | 'dot' | 'hot'): 'buff' | 'debuff' | 'neutral' {
  switch (category) {
    case 'buff':
    case 'hot':
      return 'buff';
    case 'debuff':
    case 'dot':
    case 'cc':
      return 'debuff';
    default:
      return 'neutral';
  }
}

/**
 * Convert effect name to full StatusEffect object using database data
 */
export async function createStatusEffect(
  effectName: string,
  duration: number = 3,
  value: number = 1
): Promise<StatusEffect> {
  const effectTypes = await getStatusEffectTypes();
  const effectType = effectTypes.get(effectName);

  if (!effectType) {
    throw new Error(`Unknown status effect: ${effectName}. Effect not found in database.`);
  }

  const effectTypeValue = mapCategoryToType(effectType.category);

  const statusEffect: StatusEffect = {
    id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: effectType.name,
    type: effectTypeValue,
    description: effectType.description,
    value,
    duration,
    stackable: effectType.stackable
  };

  return statusEffect;
}

/**
 * Convert array of effect names to full StatusEffect objects
 */
export async function createStatusEffects(
  effectNames: string[],
  defaultDuration: number = 3,
  defaultValue: number = 1
): Promise<StatusEffect[]> {
  const effects: StatusEffect[] = [];

  for (const effectName of effectNames) {
    const effect = await createStatusEffect(effectName, defaultDuration, defaultValue);
    effects.push(effect);
  }

  return effects;
}

/**
 * Clear the cache (useful for testing or forcing refresh)
 */
export function clearStatusEffectCache(): void {
  statusEffectCache = null;
}
