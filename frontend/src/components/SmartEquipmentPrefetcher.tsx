'use client';

import React, { useEffect } from 'react';
import { equipmentCache } from '@/services/equipmentCache';

interface SmartEquipmentPrefetcherProps {
  current_character?: string;
  current_page?: 'equipment' | 'inventory' | 'crafting' | 'battle';
  priority?: 'high' | 'medium' | 'low';
  // CamelCase variants
  currentCharacter?: string;
  currentPage?: 'equipment' | 'inventory' | 'crafting' | 'battle';
}

/**
 * Smart Equipment Prefetcher Component
 * Intelligently preloads equipment data based on user context and likely needs
 */
export default function SmartEquipmentPrefetcher({
  currentCharacter,
  currentPage = 'equipment',
  priority = 'medium'
}: SmartEquipmentPrefetcherProps) {
  
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip during SSR
    
    const prefetch_items: string[] = [];
    
    // STRATEGY 1: Current Page Context
    switch (currentPage) {
      case 'equipment':
        // Equipment page: preload generic equipment and popular characters
        prefetch_items.push('generic:all');
        prefetch_items.push('items:all');
        
        // Preload popular character equipment
        const popularCharacters = ['achilles', 'merlin', 'fenrir', 'holmes'];
        popularCharacters.forEach(char => {
          if (char !== currentCharacter) {
            prefetch_items.push(`character:${char}`);
          }
        });
        break;
        
      case 'inventory':
        // Inventory page: preload consumables and current character alternatives
        prefetch_items.push('items:all');
        if (currentCharacter) {
          prefetch_items.push(`character:${currentCharacter}`);
        }
        break;
        
      case 'crafting':
        // Crafting page: preload materials and generic equipment
        prefetch_items.push('generic:all');
        prefetch_items.push('items:all');
        break;
        
      case 'battle':
        // Battle page: preload current character equipment and consumables
        if (currentCharacter) {
          prefetch_items.push(`character:${currentCharacter}`);
        }
        prefetch_items.push('items:all');
        break;
    }
    
    // STRATEGY 2: Character Context
    if (currentCharacter) {
      // Preload related characters (same archetype or similar)
      const relatedCharacters = getRelatedCharacters(currentCharacter);
      relatedCharacters.forEach(char => {
        prefetch_items.push(`character:${char}`);
      });
    }
    
    // STRATEGY 3: Time-based prefetching
    const timeOfDay = new Date().getHours();
    if (timeOfDay >= 18 || timeOfDay <= 2) {
      // Evening/night: users often experiment with different builds
      prefetch_items.push('generic:all');
    }
    
    // Start prefetching if we have items to load
    if (prefetch_items.length > 0) {
      console.log(`🔮 Smart prefetching ${prefetch_items.length} items for ${currentPage} page`);
      
      // Delay based on priority to not interfere with immediate needs
      const delay = priority === 'high' ? 100 : priority === 'medium' ? 500 : 1000;
      
      setTimeout(() => {
        equipmentCache.queuePrefetch(prefetch_items);
      }, delay);
    }
    
  }, [currentCharacter, currentPage, priority]);
  
  // This component doesn't render anything
  return null;
}

/**
 * Get characters that are related to the current character
 * Based on archetype, origin, or thematic similarities
 */
function getRelatedCharacters(character: string): string[] {
  const characterGroups: Record<string, string[]> = {
    // Mythological/Legendary warriors
    'achilles': ['alexander_the_great', 'miyamoto_musashi'],
    'alexander_the_great': ['achilles', 'genghis_khan'],
    'miyamoto_musashi': ['achilles', 'sun_wukong'],
    
    // Magical/Scholarly characters
    'merlin': ['tesla', 'holmes'],
    'tesla': ['merlin', 'holmes'],
    'holmes': ['merlin', 'tesla'],
    
    // Dark/Gothic characters
    'dracula': ['frankenstein_monster', 'agent_x'],
    'frankenstein_monster': ['dracula'],
    
    // Mythical creatures
    'fenrir': ['sun_wukong', 'rilak_trelkar'],
    'sun_wukong': ['fenrir'],
    
    // Western/Outlaw characters
    'billy_the_kid': ['robin_hood', 'sam_spade'],
    'robin_hood': ['billy_the_kid'],
    
    // Leaders/Royalty
    'joan': ['cleopatra', 'genghis_khan'],
    'cleopatra': ['joan'],
    'genghis_khan': ['alexander_the_great', 'joan'],
    
    // Modern/Futuristic
    'space_cyborg': ['agent_x', 'rilak_trelkar'],
    'agent_x': ['space_cyborg'],
    'rilak_trelkar': ['space_cyborg', 'fenrir'],
    
    // Noir Detective
    'sam_spade': ['billy_the_kid', 'holmes']
  };
  
  return characterGroups[character] || [];
}

/**
 * Hook for using smart prefetching in components
 */
export function useSmartPrefetching(
  current_character?: string, 
  current_page?: 'equipment' | 'inventory' | 'crafting' | 'battle'
) {
  useEffect(() => {
    // Prefetch popular equipment when any equipment-related component mounts
    const popularPrefetch = [
      'generic:all',
      'character:achilles',
      'character:merlin'
    ];
    
    setTimeout(() => {
      equipmentCache.queuePrefetch(popularPrefetch);
    }, 200);
    
  }, []);
  
  // Return prefetch functions for manual triggering
  return {
    prefetch_character: (character_id: string) => {
      equipmentCache.queuePrefetch([`character:${character_id}`]);
    },
    prefetch_generic: () => {
      equipmentCache.queuePrefetch(['generic:all']);
    },
    prefetch_items: () => {
      equipmentCache.queuePrefetch(['items:all']);
    }
  };
}