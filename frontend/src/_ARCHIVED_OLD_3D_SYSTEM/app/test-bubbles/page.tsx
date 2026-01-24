'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const TestBubbleChat = dynamic(() => import('@/components/TestBubbleChat'), {
  ssr: false,
  loading: () => <div className="text-center py-8">Loading bubble system...</div>
});

export default function TestBubblesPage() {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Word Bubble Test Page
        </h1>
        
        {showInstructions && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">🧪 Testing Instructions</h2>
            <ul className="space-y-2 text-gray-300">
              <li>• This is a safe testing environment for the word bubble system</li>
              <li>• Based on the kitchen table chat but isolated from production</li>
              <li>• Toggle between bubble and traditional chat modes</li>
              <li>• Test different message types and emotions</li>
              <li>• Check performance with multiple characters</li>
            </ul>
            <button 
              onClick={() => setShowInstructions(false)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Got it, let's test!
            </button>
          </div>
        )}

        <TestBubbleChat />
      </div>
    </div>
  );
}