import type { UserCharacter } from '@blankwars/types';

interface ValidationConstraints {
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  errors?: string[];
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: string | number | boolean | UserCharacter | null,
    public constraints: ValidationConstraints
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const BattleValidation = {
  /**
   * Clamp a number to valid range
   * @throws ValidationError if not a number
   */
  clamp(value: number, min: number, max: number, field_name: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError(
        `${field_name} must be a number`,
        field_name,
        value,
        { type: 'number' }
      );
    }

    const clamped = Math.max(min, Math.min(max, value));

    if (clamped !== value) {
      console.warn(`⚠️ ${field_name} clamped from ${value} to ${clamped}`);
    }

    return clamped;
  },

  /**
   * Validate and clamp character HP
   */
  validateCharacterHp(character: UserCharacter, hp: number): number {
    const max_health = character.max_health || character.max_health || 100;
    return this.clamp(hp, 0, max_health, 'current_health');
  },

  /**
   * Validate and clamp morale (0-100)
   */
  validateMorale(morale: number): number {
    return this.clamp(morale, 0, 100, 'morale');
  },

  /**
   * Validate psychology stat (0-100)
   */
  validatePsychStat(value: number, field_name: string): number {
    return this.clamp(value, 0, 100, field_name);
  },

  /**
   * Validate character level (1-100)
   */
  validateLevel(level: number): number {
    return this.clamp(level, 1, 100, 'level');
  },

  /**
   * Validate battle ID format
   */
  validateBattleId(battle_id: string | null): boolean {
    if (!battle_id) return false;
    const BATTLE_ID_REGEX = /^battle_[a-f0-9]{32}$/;
    return BATTLE_ID_REGEX.test(battle_id);
  },

  /**
   * Validate entire character object
   * @throws ValidationError if invalid
   */
  validateCharacter(character: UserCharacter): void {
    if (!character) {
      throw new ValidationError(
        'Character is null or undefined',
        'contestant',
        character,
        { required: true }
      );
    }

    const errors: string[] = [];

    // Validate level
    const level = character.level || 1;
    if (level < 1 || level > 100) {
      errors.push(`Invalid level: ${level}`);
    }

    // Validate HP
    const current_health = character.current_health || 0;
    const max_health = character.max_health || character.max_health || 100;
    if (current_health < 0 || current_health > max_health) {
      errors.push(`Invalid HP: ${current_health}/${max_health}`);
    }

    // Validate psychology stats if present
    if (character.psych_stats) {
      const psychFields = ['mental_health', 'training', 'ego', 'team_player', 'communication'];
      psychFields.forEach(field => {
        const value = character.psych_stats[field];
        if (value !== undefined && (value < 0 || value > 100)) {
          errors.push(`Invalid ${field}: ${value}`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Character validation failed: ${errors.join(', ')}`,
        'contestant',
        character,
        { errors }
      );
    }
  },

  /**
   * Sanitize user text input
   */
  sanitizeText(text: string, max_length: number = 500): string {
    if (typeof text !== 'string') return '';

    // Truncate
    let sanitized = text.slice(0, max_length);

    // Remove script tags
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');

    // Remove other potentially dangerous tags
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed[^>]*>/gi, '');

    return sanitized;
  },

  /**
   * Validate damage value (non-negative)
   */
  validateDamage(damage: number): number {
    return this.clamp(damage, 0, Infinity, 'damage');
  },

  /**
   * Validate round number (1-100)
   */
  validateRound(round: number): number {
    return this.clamp(round, 1, 100, 'round');
  }
};
