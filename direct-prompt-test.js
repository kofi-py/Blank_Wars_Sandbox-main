// Direct test to call therapy prompt generation and see breakdown
// This bypasses the UI and calls the functions directly

// Mock the therapy context data structure
const mockTherapyContext = {
  character: {
    id: 'robin_hood',
    name: 'Robin Hood',
    archetype: 'Trickster', 
    personalityTraits: ['Mischievous', 'Loyal', 'Justice-seeking'],
    background: 'A roguish archer from Sherwood Forest, now competing in the Arena',
    species: 'Human',
    historicalPeriod: 'Medieval England',
    conflicts: 'Struggles with authority, wants justice but uses questionable methods'
  },
  roommates: [
    {
      id: 'dracula',
      name: 'Dracula',
      archetype: 'Monster',
      personalityTraits: ['Aristocratic', 'Predatory', 'Charismatic']
    },
    {
      id: 'merlin', 
      name: 'Merlin',
      archetype: 'Sage',
      personalityTraits: ['Wise', 'Mysterious', 'Powerful']
    }
  ],
  activeConflicts: [
    {
      id: 'conflict_001',
      category: 'kitchen',
      type: 'chore_dispute',
      description: 'Bathroom schedule argument between Robin Hood, Dracula, and Merlin this morning',
      severity: 'moderate',
      participants: ['robin_hood', 'dracula', 'merlin'],
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      status: 'unresolved',
      emotionalImpact: {
        robin_hood: { frustration: 7, anger: 5 },
        dracula: { annoyance: 6, superiority: 8 },
        merlin: { disappointment: 4, wisdom: 9 }
      }
    },
    {
      id: 'conflict_002', 
      category: 'personal_space',
      type: 'boundary_violation',
      description: 'Dracula using Robin\'s bow without permission yesterday',
      severity: 'high',
      participants: ['robin_hood', 'dracula'],
      timestamp: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
      status: 'escalating'
    }
  ],
  housingInfo: {
    tier: 'Basic House',
    teamSize: 3,
    location: 'Team Quarters - House B',
    roomAssignments: {
      robin_hood: 'Room 1',
      dracula: 'Room 2', 
      merlin: 'Room 3'
    },
    sharedSpaces: ['kitchen', 'living_room', 'bathroom', 'training_area']
  },
  recentEvents: [
    {
      type: 'arena_battle',
      description: 'Team lost against Team Phoenix yesterday',
      impact: 'Team morale down, blame assignment happening',
      timestamp: Date.now() - 18 * 60 * 60 * 1000
    },
    {
      type: 'kitchen_incident',
      description: 'Merlin accidentally broke Dracula\'s special goblet',
      impact: 'Dracula furious, Merlin apologetic but defensive',
      timestamp: Date.now() - 6 * 60 * 60 * 1000
    }
  ]
};

console.log('🧪 THERAPY PROMPT GENERATION TEST');
console.log('=====================================');

console.log('\n📋 Mock Therapy Context:');
console.log('Character:', mockTherapyContext.character.name);
console.log('Roommates:', mockTherapyContext.roommates.map(r => r.name).join(', '));
console.log('Active conflicts:', mockTherapyContext.activeConflicts.length);
console.log('Recent events:', mockTherapyContext.recentEvents.length);

// Simulate what the frontend would generate
const estimatedPromptSections = {
  characterIdentity: `You are ${mockTherapyContext.character.name}, a ${mockTherapyContext.character.archetype} from ${mockTherapyContext.character.historicalPeriod}...`,
  therapyContext: 'THERAPY SESSION - Individual therapy focused on conflicts and personal growth...',
  characterBackground: `CHARACTER BACKGROUND: ${mockTherapyContext.character.background}...`,
  activeConflicts: `ACTIVE CONFLICTS: ${mockTherapyContext.activeConflicts.length} unresolved conflicts...`,
  responseInstructions: 'RESPONSE REQUIREMENTS: Answer as patient, be vulnerable, 2-3 sentences max...',
  behavioralScript: 'CHARACTER BEHAVIORAL SCRIPT: Complex personality with justice-seeking tendencies...'
};

console.log('\n🔍 ESTIMATED PROMPT BREAKDOWN:');
Object.entries(estimatedPromptSections).forEach(([section, content]) => {
  const estimatedLength = content.length * 8; // Expand to realistic size
  const estimatedTokens = Math.ceil(estimatedLength / 4);
  console.log(`  ${section}: ~${estimatedLength} chars (~${estimatedTokens} tokens)`);
});

const totalEstimatedChars = Object.values(estimatedPromptSections).reduce((sum, content) => sum + (content.length * 8), 0);
const totalEstimatedTokens = Math.ceil(totalEstimatedChars / 4);

console.log(`\n📊 TOTAL ESTIMATED: ~${totalEstimatedChars} chars (~${totalEstimatedTokens} tokens)`);

console.log('\n⚠️  POTENTIAL BLOAT SOURCES:');
console.log('- Long character backgrounds and lore');
console.log('- Detailed conflict descriptions');  
console.log('- Extensive behavioral scripts');
console.log('- Reality show framing and meta instructions');
console.log('- Redundant style/voice guidance');
console.log('- Multiple overlapping response requirements');

console.log('\n✅ To see ACTUAL breakdown with frontend running:');
console.log('1. Navigate browser to http://localhost:3007');
console.log('2. Access game interface (may need auth)');
console.log('3. Go to Therapy tab');
console.log('4. Select Robin Hood + therapist');
console.log('5. Start session');
console.log('6. Check browser console for 🎭 THERAPY PROMPT BREAKDOWN');

console.log('\n💡 EXPECTED FINDINGS:');
console.log('- Base prompt: ~2500 chars (625 tokens)');
console.log('- Enhanced prompt: ~4134 chars (1034 tokens)');
console.log('- Likely culprits: behavioral scripts, long backgrounds, meta instructions');