'use client';

import RealEstateAgentChat from '../../components/RealEstateAgentChat';

export default function TestFacilities() {
  const mockTeamStats = {
    level: 18,
    total_characters: 9,
    current_facilities: ['basic_gym'],
    budget: 50000,

    living_arrangements: {
      current_tier: 'spartan_apartment',
      max_capacity: 4,
      current_occupancy: 9,
      overcrowding: 5,
      conflicts: ['dracula vs holmes', 'achilles vs joan'],
      unthemed_rooms: 2,
      floor_sleepers: 6
    },

    battle_performance: {
      recent_wins: 3,
      recent_losses: 2,
      current_streak: 'W-L-W-W-L',
      team_chemistry: 33,
      battle_effects: {},
      performance_penalties: {
        overcrowding: -25,
        conflicts: -15,
        poor_sleep: -12
      }
    },

    urgent_issues: [
      '6 fighters sleeping on floors',
      'Team chemistry at critical 33%',
      'Living in spartan apartment - major stat penalties',
      'Multiple character conflicts affecting teamwork'
    ]
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🏠 Real Estate Agent Test</h1>
          <p className="text-gray-400">Testing the integrated real estate agents with mock data</p>
        </div>

        <RealEstateAgentChat />
      </div>
    </div>
  );
}
