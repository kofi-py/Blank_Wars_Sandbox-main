'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { WordBubbleSystemRef } from '@/components/WordBubbleSystem';

// Dynamically import 3D components (client-side only)
const KitchenTable3D = dynamic(() => import('@/components/KitchenTable3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-800">
      <div className="text-white">Loading 3D Kitchen Table...</div>
    </div>
  )
});

const Confessional3D = dynamic(() => import('@/components/Confessional3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-800">
      <div className="text-white">Loading 3D Confessional...</div>
    </div>
  )
});

export default function Test3DBubbles() {
  const [activeScene, setActiveScene] = useState<'kitchen' | 'confessional'>('kitchen');
  const kitchenBubbleRef = useRef<WordBubbleSystemRef>(null);
  const confessionalBubbleRef = useRef<WordBubbleSystemRef>(null);

  // Mock character data for Kitchen Table
  const kitchenCharacters = [
    { id: 'merlin', character_id: 'merlin', name: 'Merlin', avatar: '/images/characters/merlin.png' },
    { id: 'achilles', character_id: 'achilles', name: 'Achilles', avatar: '/images/characters/achilles.png' },
    { id: 'cleopatra', character_id: 'cleopatra', name: 'Cleopatra', avatar: '/images/characters/cleopatra.png' },
    { id: 'joan', character_id: 'joan', name: 'Joan of Arc', avatar: '/images/characters/joan.png' },
    { id: 'dracula', character_id: 'dracula', name: 'Dracula', avatar: '/images/characters/dracula.png' }
  ];

  // Mock character for Confessional
  const confessionalCharacter = {
    id: 'merlin',
    character_id: 'merlin',
    name: 'Merlin',
    avatar: '/images/characters/merlin.png',
    archetype: 'Wizard'
  };

  const testMessages = {
    merlin: "The ancient texts speak of great power!",
    achilles: "My sword thirsts for battle!",
    cleopatra: "I commanded armies before you were born.",
    joan: "God guides my hand in battle.",
    dracula: "The night is my domain..."
  };

  const triggerTestBubble = (characterId: string) => {
    const ref = activeScene === 'kitchen' ? kitchenBubbleRef : confessionalBubbleRef;
    const message = testMessages[characterId as keyof typeof testMessages] || 'Test message';

    ref.current?.add_bubble(characterId, message, {
      type: 'speech',
      emotion: 'neutral',
      duration: 10000
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">
            🎬 3D Word Bubble Position Tester
          </h1>

          {/* Scene Selector */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setActiveScene('kitchen')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeScene === 'kitchen'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🍽️ Kitchen Table
            </button>
            <button
              onClick={() => setActiveScene('confessional')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeScene === 'confessional'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🎭 Confessional
            </button>
          </div>

          {/* Status */}
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
            <p className="text-sm">
              ✅ <strong>UPGRADED TO INDUSTRY STANDARD:</strong> Added transform, sprite, and occlude props.
              Bubbles now use AAA game billboard effect and proper occlusion handling.
            </p>
          </div>
        </div>
      </div>

      {/* 3D Scene Container */}
      <div className="relative h-[600px]">
        {activeScene === 'kitchen' ? (
          <KitchenTable3D
            characters={kitchenCharacters as any}
            conversations={[]}
            class_name="w-full h-full"
          />
        ) : (
          <Confessional3D
            character={confessionalCharacter as any}
            class_name="w-full h-full"
          />
        )}
      </div>

      {/* Test Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold mb-4">🧪 Test Bubble Triggers</h2>

          {activeScene === 'kitchen' ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {kitchenCharacters.map(char => (
                <button
                  key={char.id}
                  onClick={() => triggerTestBubble(char.character_id)}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                >
                  💬 {char.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => triggerTestBubble('merlin')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
              >
                💬 Trigger Confessional Bubble
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📋 What to Check:</h3>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>✅ Bubbles don't cover 3D character models</li>
              <li>✅ Bubble tails point toward character mouths</li>
              <li>✅ No bubbles go off-screen</li>
              <li>🆕 <strong>Billboard Effect:</strong> Use mouse to rotate camera - bubbles should always face you</li>
              <li>🆕 <strong>Occlusion:</strong> Rotate camera so bubble is behind character - should hide/fade</li>
              <li>🆕 <strong>Transform Following:</strong> Bubbles move smoothly with 3D transforms</li>
            </ul>
          </div>

          {/* New Feature Callout */}
          <div className="mt-4 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-purple-300">🎮 Industry Standard Features (NEW):</h3>
            <ul className="space-y-1 text-sm text-gray-300">
              <li><code className="bg-gray-800 px-2 py-0.5 rounded">transform</code> - Bubbles follow 3D world transforms</li>
              <li><code className="bg-gray-800 px-2 py-0.5 rounded">sprite</code> - Billboard effect (always face camera)</li>
              <li><code className="bg-gray-800 px-2 py-0.5 rounded">occlude</code> - Hide when behind objects</li>
            </ul>
            <p className="mt-2 text-xs text-purple-200">
              💡 Drag with mouse to rotate camera and test these features!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
