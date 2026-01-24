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
  getCharacterPosition(characterId: string): CharacterPosition | null {
    return this.positions.get(characterId) || null;
  }

  // Add or update character position
  setCharacterPosition(
    characterId: string,
    context: ChatContextType,
    subZone?: string,
    customPosition?: { x: number; y: number; scale?: number }
  ): boolean {
    const existingPosition = this.positions.get(characterId);
    
    if (customPosition) {
      // Use custom position
      const position: CharacterPosition = {
        id: `pos_${characterId}_${Date.now()}`,
        characterId,
        x: customPosition.x,
        y: customPosition.y,
        scale: customPosition.scale || 1.0,
        zone: context,
        subZone,
        isVisible: true,
        isMoving: false
      };
      
      this.positions.set(characterId, position);
      this.notifyListeners();
      return true;
    }
    
    // Auto-position based on layout
    const layout = getLayoutForContext(context);
    const zones = Object.keys(layout.positions);
    const targetZone = subZone || zones[0]; // Use first zone if not specified
    
    const occupiedPositions = this.getPositionsForContext(context);
    const nextPosition = getNextAvailablePosition(context, targetZone, occupiedPositions);
    
    if (!nextPosition) {
      console.warn(`No available positions in zone ${targetZone} for context ${context}`);
      return false;
    }
    
    const position: CharacterPosition = {
      id: `pos_${characterId}_${Date.now()}`,
      characterId,
      x: nextPosition.x,
      y: nextPosition.y,
      scale: nextPosition.scale,
      zone: context,
      subZone: targetZone,
      isVisible: true,
      isMoving: !!existingPosition // Moving if already positioned
    };
    
    // If moving from another position, set up animation
    if (existingPosition) {
      position.targetPosition = { x: nextPosition.x, y: nextPosition.y };
      position.x = existingPosition.x;
      position.y = existingPosition.y;
    }
    
    this.positions.set(characterId, position);
    this.notifyListeners();
    return true;
  }

  // Remove character from scene
  removeCharacter(characterId: string): void {
    const position = this.positions.get(characterId);
    if (position) {
      position.isVisible = false;
      this.notifyListeners();
      
      // Remove after fade-out animation
      setTimeout(() => {
        this.positions.delete(characterId);
        this.notifyListeners();
      }, 500);
    }
  }

  // Update character visibility
  setCharacterVisibility(characterId: string, isVisible: boolean): void {
    const position = this.positions.get(characterId);
    if (position) {
      position.isVisible = isVisible;
      this.notifyListeners();
    }
  }

  // Move character to new position
  moveCharacter(update: PositionUpdate): void {
    const position = this.positions.get(update.characterId);
    if (!position) return;
    
    if (update.animate && update.newPosition.x !== undefined && update.newPosition.y !== undefined) {
      position.targetPosition = {
        x: update.newPosition.x,
        y: update.newPosition.y
      };
      position.isMoving = true;
    } else {
      // Immediate update
      Object.assign(position, update.newPosition);
    }
    
    this.notifyListeners();
  }

  // Clear all positions for a context
  clearContext(context: ChatContextType): void {
    const toRemove = this.getPositionsForContext(context);
    toRemove.forEach(pos => this.removeCharacter(pos.characterId));
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
        if (position.isMoving && position.targetPosition) {
          const dx = position.targetPosition.x - position.x;
          const dy = position.targetPosition.y - position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 0.5) {
            // Reached target
            position.x = position.targetPosition.x;
            position.y = position.targetPosition.y;
            position.isMoving = false;
            position.targetPosition = undefined;
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
  characterIds: string[],
  specificZone?: string
): boolean {
  const manager = getCharacterPositionManager();
  
  // Clear existing positions for this context
  manager.clearContext(context);
  
  // Position each character
  let allPositioned = true;
  characterIds.forEach(id => {
    const success = manager.setCharacterPosition(id, context, specificZone);
    if (!success) allPositioned = false;
  });
  
  return allPositioned;
}