'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * Rubber Duck River Race Game Page
 * Full-screen standalone game experience
 */
export default function RubberDuckRiverRacePage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Exit button */}
      <button
        onClick={() => router.push('/challenges')}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors"
      >
        <ArrowLeft size={20} />
        Exit Game
      </button>

      {/* Game iframe - full screen */}
      <iframe
        src="/minigames/rubber-duck-river-race/index.html"
        className="w-full h-full border-0"
        title="Rubber Duck River Race Game"
        allow="accelerometer; gyroscope; fullscreen"
      />
    </div>
  );
}
