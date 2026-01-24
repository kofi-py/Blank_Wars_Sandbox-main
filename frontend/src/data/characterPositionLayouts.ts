import { PositionLayout, ChatContextType } from '@/types/wordBubble';

// Predefined position layouts for all 18 chat contexts
export const positionLayouts: Record<ChatContextType, PositionLayout> = {
  // Battle context - team formations
  battle: {
    context: 'battle',
    positions: {
      player_team: {
        max_characters: 5,
        default_positions: [
          { x: 20, y: 30, scale: 1.0 }, // Front left
          { x: 30, y: 50, scale: 1.0 }, // Middle left
          { x: 20, y: 70, scale: 1.0 }, // Back left
          { x: 10, y: 50, scale: 0.9 }, // Far left
          { x: 25, y: 10, scale: 0.9 }, // Top left
        ]
      },
      opponent_team: {
        max_characters: 5,
        default_positions: [
          { x: 80, y: 30, scale: 1.0 }, // Front right
          { x: 70, y: 50, scale: 1.0 }, // Middle right
          { x: 80, y: 70, scale: 1.0 }, // Back right
          { x: 90, y: 50, scale: 0.9 }, // Far right
          { x: 75, y: 10, scale: 0.9 }, // Top right
        ]
      },
      coach_area: {
        max_characters: 1,
        default_positions: [
          { x: 50, y: 90, scale: 0.8 } // Bottom center
        ]
      }
    }
  },

  // Kitchen table - circular arrangement
  kitchen: {
    context: 'kitchen',
    positions: {
      kitchen_table: {
        max_characters: 6,
        center_point: { x: 50, y: 50 },
        radius: 25,
        default_positions: [
          { x: 50, y: 25, scale: 1.0 }, // Top
          { x: 75, y: 37, scale: 1.0 }, // Top right
          { x: 75, y: 63, scale: 1.0 }, // Bottom right
          { x: 50, y: 75, scale: 1.0 }, // Bottom
          { x: 25, y: 63, scale: 1.0 }, // Bottom left
          { x: 25, y: 37, scale: 1.0 }, // Top left
        ]
      },
      kitchen_counter: {
        max_characters: 2,
        default_positions: [
          { x: 85, y: 20, scale: 0.9 },
          { x: 85, y: 80, scale: 0.9 }
        ]
      },
      kitchen_entrance: {
        max_characters: 1,
        default_positions: [
          { x: 10, y: 50, scale: 0.8 }
        ]
      }
    }
  },

  // Confessional - intimate one-on-one
  confessional: {
    context: 'confessional',
    positions: {
      character_seat: {
        max_characters: 1,
        default_positions: [
          { x: 30, y: 50, scale: 1.2 } // Left side, larger
        ]
      },
      interviewer: {
        max_characters: 1,
        default_positions: [
          { x: 80, y: 50, scale: 0.8 } // Right side, smaller (off-camera feel)
        ]
      }
    }
  },

  // Training grounds - action positions
  training: {
    context: 'training',
    positions: {
      training_field: {
        max_characters: 3,
        default_positions: [
          { x: 50, y: 40, scale: 1.1 }, // Center stage
          { x: 30, y: 60, scale: 0.9 }, // Left support
          { x: 70, y: 60, scale: 0.9 }  // Right support
        ]
      },
      coach_position: {
        max_characters: 1,
        default_positions: [
          { x: 50, y: 80, scale: 1.0 } // Bottom center
        ]
      }
    }
  },

  // Individual therapy - face to face
  therapy_individual: {
    context: 'therapy_individual',
    positions: {
      patient_chair: {
        max_characters: 1,
        default_positions: [
          { x: 35, y: 50, scale: 1.0 }
        ]
      },
      therapist_chair: {
        max_characters: 1,
        default_positions: [
          { x: 65, y: 50, scale: 1.0 }
        ]
      }
    }
  },

  // Group therapy - circle formation
  therapy_group: {
    context: 'therapy_group',
    positions: {
      therapy_circle: {
        max_characters: 8,
        center_point: { x: 50, y: 50 },
        radius: 30,
        default_positions: [
          { x: 50, y: 20, scale: 0.9 }, // Top (therapist)
          { x: 73, y: 27, scale: 0.9 },
          { x: 80, y: 50, scale: 0.9 },
          { x: 73, y: 73, scale: 0.9 },
          { x: 50, y: 80, scale: 0.9 },
          { x: 27, y: 73, scale: 0.9 },
          { x: 20, y: 50, scale: 0.9 },
          { x: 27, y: 27, scale: 0.9 }
        ]
      }
    }
  },

  // 1-on-1 coaching sessions (similar layout for all)
  coaching_performance: {
    context: 'coaching_performance',
    positions: {
      character: {
        max_characters: 1,
        default_positions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      coach: {
        max_characters: 1,
        default_positions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_equipment: {
    context: 'coaching_equipment',
    positions: {
      character: {
        max_characters: 1,
        default_positions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      advisor: {
        max_characters: 1,
        default_positions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_skill: {
    context: 'coaching_skill',
    positions: {
      character: {
        max_characters: 1,
        default_positions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      trainer: {
        max_characters: 1,
        default_positions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_personal: {
    context: 'coaching_personal',
    positions: {
      character: {
        max_characters: 1,
        default_positions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      coach: {
        max_characters: 1,
        default_positions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_financial: {
    context: 'coaching_financial',
    positions: {
      character: {
        max_characters: 1,
        default_positions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      advisor: {
        max_characters: 1,
        default_positions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  // Social contexts - casual groupings
  social_1: {
    context: 'social_1',
    positions: {
      lounge_area: {
        max_characters: 4,
        default_positions: [
          { x: 30, y: 40, scale: 1.0 },
          { x: 70, y: 40, scale: 1.0 },
          { x: 30, y: 70, scale: 1.0 },
          { x: 70, y: 70, scale: 1.0 }
        ]
      }
    }
  },

  social_2: {
    context: 'social_2',
    positions: {
      activity_area: {
        max_characters: 6,
        default_positions: [
          { x: 25, y: 30, scale: 0.9 },
          { x: 50, y: 30, scale: 0.9 },
          { x: 75, y: 30, scale: 0.9 },
          { x: 25, y: 60, scale: 0.9 },
          { x: 50, y: 60, scale: 0.9 },
          { x: 75, y: 60, scale: 0.9 }
        ]
      }
    }
  },

  social_3: {
    context: 'social_3',
    positions: {
      gathering_spot: {
        max_characters: 5,
        center_point: { x: 50, y: 50 },
        radius: 20,
        default_positions: [
          { x: 50, y: 30, scale: 1.0 },
          { x: 70, y: 40, scale: 1.0 },
          { x: 65, y: 60, scale: 1.0 },
          { x: 35, y: 60, scale: 1.0 },
          { x: 30, y: 40, scale: 1.0 }
        ]
      }
    }
  },

  // Real estate consultation
  real_estate: {
    context: 'real_estate',
    positions: {
      client: {
        max_characters: 1,
        default_positions: [{ x: 40, y: 50, scale: 1.0 }]
      },
      agent: {
        max_characters: 1,
        default_positions: [{ x: 60, y: 50, scale: 1.0 }]
      },
      property_display: {
        max_characters: 0, // For UI elements
        default_positions: [{ x: 50, y: 20, scale: 1.2 }]
      }
    }
  },

  // Personal trainer
  personal_trainer: {
    context: 'personal_trainer',
    positions: {
      trainee: {
        max_characters: 1,
        default_positions: [{ x: 50, y: 50, scale: 1.1 }]
      },
      trainer: {
        max_characters: 1,
        default_positions: [{ x: 50, y: 80, scale: 0.9 }]
      }
    }
  },

  // Simple chat - basic side by side
  simple_chat: {
    context: 'simple_chat',
    positions: {
      default: {
        max_characters: 2,
        default_positions: [
          { x: 35, y: 50, scale: 1.0 },
          { x: 65, y: 50, scale: 1.0 }
        ]
      }
    }
  }
};

// Helper function to get positions for a context
export function getLayoutForContext(context: ChatContextType): PositionLayout {
  return positionLayouts[context];
}

// Helper function to calculate position for circular arrangements
export function calculateCircularPosition(
  index: number, 
  total: number, 
  center_point: { x: number; y: number }, 
  radius: number
): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
  return {
    x: center_point.x + radius * Math.cos(angle),
    y: center_point.y + radius * Math.sin(angle)
  };
}

// Helper to get next available position in a zone
export function getNextAvailablePosition(
  context: ChatContextType,
  zone: string,
  occupied_positions: { x: number; y: number; scale: number; zone?: string; subZone?: string }[]
): { x: number; y: number; scale: number } | null {
  const layout = positionLayouts[context];
  const zoneConfig = layout.positions[zone];

  if (!zoneConfig) return null;

  const occupiedCount = occupied_positions.filter(p => p.zone === context && p.subZone === zone).length;
  
  if (occupiedCount >= zoneConfig.max_characters) return null;
  
  // If circular arrangement
  if (zoneConfig.center_point && zoneConfig.radius) {
    const position = calculateCircularPosition(
      occupiedCount,
      zoneConfig.max_characters,
      zoneConfig.center_point,
      zoneConfig.radius
    );
    return { ...position, scale: 0.9 };
  }
  
  // Otherwise use predefined positions
  return zoneConfig.default_positions[occupiedCount] || null;
}