// ===================================================================
// COMPREHENSIVE CHARACTER AGENT KEY RESOLVER
// ===================================================================
// Maps all character IDs (therapists, real estate agents, coachable characters)
// to their correct LocalAI agent keys based on database analysis

// Therapist ID to agent key resolver for therapy sessions
export function resolveTherapistAgentKey(id: string): string {
  const k = (id || '').toLowerCase().replace(/\s+/g, '-');
  const therapistMap: Record<string, string> = {
    // Therapists (3 total)
    'carl-jung': 'carl_jung',
    'jung': 'carl_jung',
    'seraphina': 'seraphina',
    'fairy-godmother': 'seraphina',
    'alien-therapist': 'zxk14bw7',
    'zxk14bw7': 'zxk14bw7',
    'zxk14bw^7': 'zxk14bw7',
  };
  return therapistMap[k] || id; // fall back to original id
}

// Real Estate Agent resolver
export function resolveRealEstateAgentKey(id: string): string {
  const k = (id || '').toLowerCase().replace(/\s+/g, '_');
  const reMap: Record<string, string> = {
    // Real Estate Agents (3 total)
    'barry': 'barry',
    'lmb_3000': 'lmb_3000',
    'zyxthala': 'zyxthala',
  };
  return reMap[k] || id;
}

// Comprehensive character resolver for all character types
export function resolveCharacterAgentKey(id: string): string {
  const normalizedId = (id || '').toLowerCase();
  
  // Comprehensive mapping based on database analysis
  const characterMap: Record<string, string> = {
    // === THERAPISTS (3) ===
    'carl-jung': 'carl_jung',
    'seraphina': 'seraphina', 
    'zxk14bw7': 'zxk14bw7',
    'zxk14bw^7': 'zxk14bw7',
    
    // === REAL ESTATE AGENTS (3) ===
    'barry': 'barry',
    'lmb_3000': 'lmb_3000',
    'zyxthala': 'zyxthala',
    
    // === COACHABLE CHARACTERS (17) ===
    'achilles': 'achilles',
    'agent_x': 'agent_x',
    'rilak_trelkar': 'rilak_trelkar',
    'rilak': 'rilak_trelkar',
    'billy_the_kid': 'billy_the_kid',
    'cleopatra': 'cleopatra',
    'dracula': 'dracula',
    'fenrir': 'fenrir',
    'frankenstein_monster': 'frankenstein_monster',
    'genghis_khan': 'genghis_khan',
    'holmes': 'holmes',
    'joan': 'joan',
    'merlin': 'merlin',
    'robin_hood': 'robin_hood',
    'sam_spade': 'sam_spade',
    'space_cyborg': 'space_cyborg',
    'sun_wukong': 'sun_wukong',
    'tesla': 'tesla',
  };
  
  return characterMap[normalizedId] || id;
}

// Character display name mapping (for UI display)
export function getCharacterDisplayName(character_id: string): string {
  const display_nameMap: Record<string, string> = {
    // Coachable characters
    'robin_hood': 'Robin Hood',
    'frankenstein_monster': 'Frankenstein\'s Monster',
    'sherlock_holmes': 'Sherlock Holmes',
    'holmes': 'Sherlock Holmes',
    'achilles': 'Achilles',
    'billy_the_kid': 'Billy the Kid',
    'genghis_khan': 'Genghis Khan',
    'sun_wukong': 'Sun Wukong',
    'agent_x': 'Agent X',
    'rilak_trelkar': 'Rilak-Trelkar',
    'rilak': 'Rilak-Trelkar',
    'space_cyborg': 'Space Cyborg',
    'sam_spade': 'Sam Spade',
    'joan': 'Joan of Arc',
    'tesla': 'Nikola Tesla',
    'cleopatra': 'Cleopatra',
    'dracula': 'Count Dracula',
    'fenrir': 'Fenrir',
    'merlin': 'Merlin',
    
    // Therapists
    'carl-jung': 'Carl Jung',
    'seraphina': 'Fairy Godmother Seraphina',
    'zxk14bw7': 'Zxk14bW^7',
    
    // Real Estate Agents
    'barry': 'Barry the Closer',
    'lmb_3000': 'LMB 3000',
    'zyxthala': 'Zyxthala',
  };
  
  return display_nameMap[character_id] || character_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Backward compatibility exports
export const mapTherapistToAgentKey = resolveTherapistAgentKey;
export const mapCharacterToAgentKey = resolveCharacterAgentKey;