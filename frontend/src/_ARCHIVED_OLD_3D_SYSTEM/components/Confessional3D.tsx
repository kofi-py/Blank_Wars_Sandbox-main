'use client';

import React, { useRef, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { WordBubbleSystemRef } from './WordBubbleSystem';
import { Contestant } from '@blankwars/types';

// Dynamically import 3D component (client-side only)
const ChatTheater3D = dynamic(() => import('./ChatTheater3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-900 to-gray-800">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-400 mx-auto mb-4"></div>
        <p className="text-lg">Loading 3D Confessional...</p>
      </div>
    </div>
  )
});

interface Confessional3DProps {
  character: Contestant | null;
  class_name?: string;
}

/**
 * 3D Confessional Booth
 * Displays character in Spartan apartment setting with 3D model
 * Falls back gracefully if model fails to load
 */
const Confessional3D = forwardRef<WordBubbleSystemRef, Confessional3DProps>(({ character, class_name = '' }, ref) => {

  // If no character, show empty state
  if (!character) {
    return (
      <div className={`relative w-full h-full ${class_name} flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-gray-800/20 rounded-xl`}>
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-lg">Select a character to begin confessional</p>
        </div>
      </div>
    );
  }

  // Transform Character to the format ChatTheater3D expects
  const participants = [{
    character_id: character.id,
    character_name: character.name,
    character_avatar: character.avatar || ''
  }];

  return (
    <div className={`relative w-full h-full ${class_name}`}>
      {/* 3D Scene */}
      <ChatTheater3D
        ref={ref}
        context_type="confessional"
        participants={participants}
        is_enabled={true}
        class_name="w-full h-full"
      />

      {/* Confessional context label */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
        <div className="font-semibold">🎭 Confessional Booth</div>
        <div className="text-xs text-gray-300">
          Spartan Apartment Setting
        </div>
      </div>

      {/* Character name indicator */}
      <div className="absolute top-4 left-4 bg-purple-900 bg-opacity-80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none border border-purple-500">
        <div className="font-semibold">{character.name}</div>
        <div className="text-xs text-purple-300">{character.archetype}</div>
      </div>
    </div>
  );
});

Confessional3D.displayName = 'Confessional3D';

export default Confessional3D;
