import { PositionLayout, ChatContextType } from '@/types/wordBubble';

// Predefined position layouts for all 18 chat contexts
export const positionLayouts: Record<ChatContextType, PositionLayout> = {
  // Battle context - team formations
  battle: {
    context: 'battle',
    positions: {
      player_team: {
        maxCharacters: 5,
        defaultPositions: [
          { x: 20, y: 30, scale: 1.0 }, // Front left
          { x: 30, y: 50, scale: 1.0 }, // Middle left
          { x: 20, y: 70, scale: 1.0 }, // Back left
          { x: 10, y: 50, scale: 0.9 }, // Far left
          { x: 25, y: 10, scale: 0.9 }, // Top left
        ]
      },
      opponent_team: {
        maxCharacters: 5,
        defaultPositions: [
          { x: 80, y: 30, scale: 1.0 }, // Front right
          { x: 70, y: 50, scale: 1.0 }, // Middle right
          { x: 80, y: 70, scale: 1.0 }, // Back right
          { x: 90, y: 50, scale: 0.9 }, // Far right
          { x: 75, y: 10, scale: 0.9 }, // Top right
        ]
      },
      coach_area: {
        maxCharacters: 1,
        defaultPositions: [
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
        maxCharacters: 6,
        centerPoint: { x: 50, y: 50 },
        radius: 25,
        defaultPositions: [
          { x: 50, y: 25, scale: 1.0 }, // Top
          { x: 75, y: 37, scale: 1.0 }, // Top right
          { x: 75, y: 63, scale: 1.0 }, // Bottom right
          { x: 50, y: 75, scale: 1.0 }, // Bottom
          { x: 25, y: 63, scale: 1.0 }, // Bottom left
          { x: 25, y: 37, scale: 1.0 }, // Top left
        ]
      },
      kitchen_counter: {
        maxCharacters: 2,
        defaultPositions: [
          { x: 85, y: 20, scale: 0.9 },
          { x: 85, y: 80, scale: 0.9 }
        ]
      },
      kitchen_entrance: {
        maxCharacters: 1,
        defaultPositions: [
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
        maxCharacters: 1,
        defaultPositions: [
          { x: 30, y: 50, scale: 1.2 } // Left side, larger
        ]
      },
      interviewer: {
        maxCharacters: 1,
        defaultPositions: [
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
        maxCharacters: 3,
        defaultPositions: [
          { x: 50, y: 40, scale: 1.1 }, // Center stage
          { x: 30, y: 60, scale: 0.9 }, // Left support
          { x: 70, y: 60, scale: 0.9 }  // Right support
        ]
      },
      coach_position: {
        maxCharacters: 1,
        defaultPositions: [
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
        maxCharacters: 1,
        defaultPositions: [
          { x: 35, y: 50, scale: 1.0 }
        ]
      },
      therapist_chair: {
        maxCharacters: 1,
        defaultPositions: [
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
        maxCharacters: 8,
        centerPoint: { x: 50, y: 50 },
        radius: 30,
        defaultPositions: [
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
        maxCharacters: 1,
        defaultPositions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      coach: {
        maxCharacters: 1,
        defaultPositions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_equipment: {
    context: 'coaching_equipment',
    positions: {
      character: {
        maxCharacters: 1,
        defaultPositions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      advisor: {
        maxCharacters: 1,
        defaultPositions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_skill: {
    context: 'coaching_skill',
    positions: {
      character: {
        maxCharacters: 1,
        defaultPositions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      trainer: {
        maxCharacters: 1,
        defaultPositions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_personal: {
    context: 'coaching_personal',
    positions: {
      character: {
        maxCharacters: 1,
        defaultPositions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      coach: {
        maxCharacters: 1,
        defaultPositions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  coaching_financial: {
    context: 'coaching_financial',
    positions: {
      character: {
        maxCharacters: 1,
        defaultPositions: [{ x: 35, y: 50, scale: 1.0 }]
      },
      advisor: {
        maxCharacters: 1,
        defaultPositions: [{ x: 65, y: 50, scale: 1.0 }]
      }
    }
  },

  // Social contexts - casual groupings
  social_1: {
    context: 'social_1',
    positions: {
      lounge_area: {
        maxCharacters: 4,
        defaultPositions: [
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
        maxCharacters: 6,
        defaultPositions: [
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
        maxCharacters: 5,
        centerPoint: { x: 50, y: 50 },
        radius: 20,
        defaultPositions: [
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
        maxCharacters: 1,
        defaultPositions: [{ x: 40, y: 50, scale: 1.0 }]
      },
      agent: {
        maxCharacters: 1,
        defaultPositions: [{ x: 60, y: 50, scale: 1.0 }]
      },
      property_display: {
        maxCharacters: 0, // For UI elements
        defaultPositions: [{ x: 50, y: 20, scale: 1.2 }]
      }
    }
  },

  // Personal trainer
  personal_trainer: {
    context: 'personal_trainer',
    positions: {
      trainee: {
        maxCharacters: 1,
        defaultPositions: [{ x: 50, y: 50, scale: 1.1 }]
      },
      trainer: {
        maxCharacters: 1,
        defaultPositions: [{ x: 50, y: 80, scale: 0.9 }]
      }
    }
  },

  // Simple chat - basic side by side
  simple_chat: {
    context: 'simple_chat',
    positions: {
      default: {
        maxCharacters: 2,
        defaultPositions: [
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
  centerPoint: { x: number; y: number }, 
  radius: number
): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
  return {
    x: centerPoint.x + radius * Math.cos(angle),
    y: centerPoint.y + radius * Math.sin(angle)
  };
}

// Helper to get next available position in a zone
export function getNextAvailablePosition(
  context: ChatContextType,
  zone: string,
  occupiedPositions: CharacterPosition[]
): { x: number; y: number; scale: number } | null {
  const layout = positionLayouts[context];
  const zoneConfig = layout.positions[zone];
  
  if (!zoneConfig) return null;
  
  const occupiedCount = occupiedPositions.filter(p => p.zone === context && p.subZone === zone).length;
  
  if (occupiedCount >= zoneConfig.maxCharacters) return null;
  
  // If circular arrangement
  if (zoneConfig.centerPoint && zoneConfig.radius) {
    const position = calculateCircularPosition(
      occupiedCount,
      zoneConfig.maxCharacters,
      zoneConfig.centerPoint,
      zoneConfig.radius
    );
    return { ...position, scale: 0.9 };
  }
  
  // Otherwise use predefined positions
  return zoneConfig.defaultPositions[occupiedCount] || null;
}