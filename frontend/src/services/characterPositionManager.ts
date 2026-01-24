import { CharacterPosition, ChatContextType, PositionUpdate } from '@/types/wordBubble';
import { getLayoutForContext, getNextAvailablePosition } from '@/data/characterPositionLayouts';

export class CharacterPositionManager {
  private positions: Map<string, CharacterPosition> = new Map();
  private positionListeners: ((positions: CharacterPosition[]) => void)[] = [];
  private animationFrameId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startAnimationLoop();
    }
  }

  // Subscribe to position changes
  subscribe(listener: (positions: CharacterPosition[]) => void): () => void {
    this.positionListeners.push(listener);
    listener(this.getAllPositions()); // Initial state
    
    return () => {
      this.positionListeners = this.positionListeners.filter(l => l !== listener);
    };
  }

  // Get all current positions
  getAllPositions(): CharacterPosition[] {
    return Array.from(this.positions.values());
  }

  // Get positions for a specific context
  getPositionsForContext(context: ChatContextType): CharacterPosition[] {
    return this.getAllPositions().filter(p => p.zone === context);
  }

  // Get position for a specific character
  getCharacterPosition(character_id: string): CharacterPosition | null {
    return this.positions.get(character_id) || null;
  }

  // Add or update character position
  setCharacterPosition(
    character_id: string,
    context: ChatContextType,
    sub_zone?: string,
    custom_position?: { x: number; y: number; scale?: number }
  ): boolean {
    const existingPosition = this.positions.get(character_id);
    
    if (custom_position) {
      // Use custom position
      const position: CharacterPosition = {
        id: `pos_${character_id}_${Date.now()}`,
        character_id,
        x: custom_position.x,
        y: custom_position.y,
        scale: custom_position.scale || 1.0,
        zone: context,
        sub_zone,
        is_visible: true,
        is_moving: false
      };
      
      this.positions.set(character_id, position);
      this.notifyListeners();
      return true;
    }
    
    // Auto-position based on layout
    const layout = getLayoutForContext(context);
    const zones = Object.keys(layout.positions);
    const targetZone = sub_zone || zones[0]; // Use first zone if not specified
    
    const occupiedPositions = this.getPositionsForContext(context);
    const nextPosition = getNextAvailablePosition(context, targetZone, occupiedPositions);
    
    if (!nextPosition) {
      console.warn(`No available positions in zone ${targetZone} for context ${context}`);
      return false;
    }
    
    const position: CharacterPosition = {
      id: `pos_${character_id}_${Date.now()}`,
      character_id,
      x: nextPosition.x,
      y: nextPosition.y,
      scale: nextPosition.scale,
      zone: context,
      sub_zone: targetZone,
      is_visible: true,
      is_moving: !!existingPosition // Moving if already positioned
    };
    
    // If moving from another position, set up animation
    if (existingPosition) {
      position.target_position = { x: nextPosition.x, y: nextPosition.y };
      position.x = existingPosition.x;
      position.y = existingPosition.y;
    }
    
    this.positions.set(character_id, position);
    this.notifyListeners();
    return true;
  }

  // Remove character from scene
  removeCharacter(character_id: string): void {
    const position = this.positions.get(character_id);
    if (position) {
      position.is_visible = false;
      this.notifyListeners();
      
      // Remove after fade-out animation
      setTimeout(() => {
        this.positions.delete(character_id);
        this.notifyListeners();
      }, 500);
    }
  }

  // Update character visibility
  setCharacterVisibility(character_id: string, is_visible: boolean): void {
    const position = this.positions.get(character_id);
    if (position) {
      position.is_visible = is_visible;
      this.notifyListeners();
    }
  }

  // Move character to new position
  moveCharacter(update: PositionUpdate): void {
    const position = this.positions.get(update.character_id);
    if (!position) return;
    
    if (update.animate && update.new_position.x !== undefined && update.new_position.y !== undefined) {
      position.target_position = {
        x: update.new_position.x,
        y: update.new_position.y
      };
      position.is_moving = true;
    } else {
      // Immediate update
      Object.assign(position, update.new_position);
    }
    
    this.notifyListeners();
  }

  // Clear all positions for a context
  clearContext(context: ChatContextType): void {
    const toRemove = this.getPositionsForContext(context);
    toRemove.forEach(pos => this.removeCharacter(pos.character_id));
  }

  // Clear all positions
  clearAll(): void {
    this.positions.clear();
    this.notifyListeners();
  }

  // Animation loop for smooth movements
  private startAnimationLoop(): void {
    const animate = () => {
      let hasChanges = false;
      
      this.positions.forEach(position => {
        if (position.is_moving && position.target_position) {
          const dx = position.target_position.x - position.x;
          const dy = position.target_position.y - position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 0.5) {
            // Reached target
            position.x = position.target_position.x;
            position.y = position.target_position.y;
            position.is_moving = false;
            position.target_position = undefined;
            hasChanges = true;
          } else {
            // Move towards target
            const speed = 0.1; // Adjust for animation speed
            position.x += dx * speed;
            position.y += dy * speed;
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        this.notifyListeners();
      }
      
      if (typeof window !== 'undefined') {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  // Notify all listeners of position changes
  private notifyListeners(): void {
    const positions = this.getAllPositions();
    this.positionListeners.forEach(listener => listener(positions));
  }

  // Clean up
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.positions.clear();
    this.positionListeners = [];
  }
}

// Singleton instance
let instance: CharacterPositionManager | null = null;

export function getCharacterPositionManager(): CharacterPositionManager {
  if (!instance) {
    instance = new CharacterPositionManager();
  }
  return instance;
}

// Helper function to position characters for a chat session
export function positionCharactersForChat(
  context: ChatContextType,
  character_ids: string[],
  specific_zone?: string
): boolean {
  const manager = getCharacterPositionManager();
  
  // Clear existing positions for this context
  manager.clearContext(context);
  
  // Position each character
  let allPositioned = true;
  character_ids.forEach(id => {
    const success = manager.setCharacterPosition(id, context, specific_zone);
    if (!success) allPositioned = false;
  });
  
  return allPositioned;
}