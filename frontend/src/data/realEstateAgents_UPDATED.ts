// Updated Real Estate Agents for _____ Wars HQ Facilities
// UI display data only - personality/prompts are in backend domain files

import { RealEstateAgent } from './realEstateAgentTypes';

export const realEstateAgents: RealEstateAgent[] = [
  {
    id: 'barry',
    name: 'Barry "The Closer"',
    avatar: 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main/Headquarters/Facilities/Real_Estate_Agents/barry.png',
    tagline: 'Closer',
  },
  {
    id: 'lmb_3000',
    name: 'LMB-3000 "Robot Lady Macbeth"',
    avatar: 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main/Headquarters/Facilities/Real_Estate_Agents/lmb_3000.png',
    tagline: 'Malfunctioning Power Broker',
  },
  {
    id: 'zyxthala',
    name: 'Zyxthala the Reptilian',
    avatar: 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main/Headquarters/Facilities/Real_Estate_Agents/zyxthala.png',
    tagline: 'Efficiency Optimizer',
  },
];

// Facility bonuses each agent provides when chosen
export const agentBonuses = {
  barry: {
    name: "Speed Deals",
    description: "All facility purchases cost 15% less, training speed increased by 10%",
    effects: {
      facility_cost_reduction: 0.15,
      training_speed_bonus: 0.10
    }
  },
  lmb_3000: {
    name: "Dramatic Ambition",
    description: "Facilities provide +20% XP gain, team gains 'Ambition' trait",
    effects: {
      xp_bonus: 0.20,
      team_trait: "ambitious"
    }
  },
  zyxthala: {
    name: "Optimal Efficiency",
    description: "Facilities have perfect climate control, +15% energy regeneration",
    effects: {
      energy_regenBonus: 0.15,
      climate_immunity: true
    }
  }
};
