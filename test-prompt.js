// Simple test to trigger therapy prompt generation and see detailed breakdown
const fs = require('fs');
const path = require('path');

// Mock minimal data structures to trigger the prompt generation
const mockTherapyContext = {
  character: {
    id: 'robin_hood',
    name: 'Robin Hood', 
    archetype: 'Trickster',
    personalityTraits: ['Mischievous', 'Loyal'],
    background: 'A roguish archer from Sherwood Forest'
  },
  roommates: [
    { name: 'Dracula', archetype: 'Monster' },
    { name: 'Merlin', archetype: 'Sage' }
  ],
  activeConflicts: [
    {
      category: 'kitchen',
      description: 'Bathroom schedule argument with Dracula and Merlin',
      timestamp: Date.now()
    }
  ],
  housingInfo: {
    tier: 'Basic House',
    teamSize: 3,
    location: 'Team Quarters'
  }
};

console.log('📋 MOCK THERAPY CONTEXT TEST');
console.log('Character:', mockTherapyContext.character.name);
console.log('Roommates:', mockTherapyContext.roommates.map(r => r.name).join(', '));
console.log('Active conflicts:', mockTherapyContext.activeConflicts.length);

// This will help us understand the structure before building the actual test
console.log('\n✅ Mock data ready. To see actual prompt breakdown:');
console.log('1. Open browser to http://localhost:3007');
console.log('2. Navigate to Therapy tab'); 
console.log('3. Select Robin Hood as patient');
console.log('4. Select any therapist');
console.log('5. Click "Start Session"');
console.log('6. Check browser console for detailed prompt breakdown');