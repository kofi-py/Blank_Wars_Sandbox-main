'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { WordBubbleSystemRef } from '@/components/WordBubbleSystem';
import { hasCharacter3DModel } from '@/utils/characterImageUtils';
import { characterAPI, type Contestant } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

// Dynamically import 3D component (client-side only)
const ChatTheater3D = dynamic(() => import('@/components/ChatTheater3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900">
      <div className="text-white text-xl">Loading 3D Visual Theater...</div>
    </div>
  )
});

export default function Test3DTheaterPage() {
  const { user, is_loading: authLoading, is_authenticated } = useAuth();
  const [showInstructions, setShowInstructions] = useState(true);
  const [participants, setParticipants] = useState<Array<{
    character_id: string;
    character_name: string;
    character_avatar: string;
  }>>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bubbleSystemRef = useRef<WordBubbleSystemRef>(null);

  // Fetch real user characters from database
  useEffect(() => {
    async function fetchUserCharacters() {
      // Wait for auth to complete
      if (authLoading) {
        console.log('⏳ Waiting for auth...');
        return;
      }

      // If not authenticated, use EXACT production Kitchen Table characters
      if (!is_authenticated) {
        console.log('🔓 Not authenticated, using exact production characters');
        setParticipants([
          { character_id: 'agent_x', character_name: 'Agent X', character_avatar: '🕶️' },
          { character_id: 'achilles', character_name: 'Achilles', character_avatar: '⚔️' },
          { character_id: 'merlin', character_name: 'Merlin', character_avatar: '🧙' }
        ]);
        setIsLoading(false);
        return;
      }

      try {
        console.log('🎭 Fetching user characters via characterAPI...');

        // Use the proper API client that routes to backend
        const characters = await characterAPI.get_user_characters();

        console.log('✅ Found', characters.length, 'total characters');

        // Filter to only characters with 3D models
        const charactersWithModels = characters
          .filter((char: Contestant) => {
            const hasModel = hasCharacter3DModel(char.name);
            console.log(`🎨 ${char.name}: ${hasModel ? 'HAS' : 'NO'} 3D model`);
            return hasModel;
          })
          .slice(0, 8); // Limit to 8 characters for performance

        console.log('🎭 Characters with 3D models:', charactersWithModels.length);

        if (charactersWithModels.length === 0) {
          console.log('⚠️ No characters with 3D models, using exact production characters');
          setParticipants([
            { character_id: 'agent_x', character_name: 'Agent X', character_avatar: '🕶️' },
            { character_id: 'achilles', character_name: 'Achilles', character_avatar: '⚔️' },
            { character_id: 'merlin', character_name: 'Merlin', character_avatar: '🧙' }
          ]);
        } else {
          const formattedParticipants = charactersWithModels.map((char: Contestant) => ({
            character_id: char.id,
            character_name: char.name,
            character_avatar: char.avatar || '🎭'
          }));

          console.log('✨ Formatted participants:', formattedParticipants);
          setParticipants(formattedParticipants);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Error fetching user characters:', err);
        setError('Failed to load characters');
        setIsLoading(false);

        // Fallback to exact production characters if fetch fails
        console.log('🔄 Using fallback production characters');
        setParticipants([
          { character_id: 'agent_x', character_name: 'Agent X', character_avatar: '🕶️' },
          { character_id: 'achilles', character_name: 'Achilles', character_avatar: '⚔️' },
          { character_id: 'merlin', character_name: 'Merlin', character_avatar: '🧙' }
        ]);
      }
    }

    fetchUserCharacters();
  }, [authLoading, is_authenticated]);

  // Generate test messages based on actual characters
  const testMessages = participants.map(p => ({
    character_id: p.character_id,
    message: `${p.character_name}: Ready for the 3D theater!`
  }));

  const sendTestMessage = (index: number) => {
    if (index >= testMessages.length) return;
    const msg = testMessages[index];
    if (bubbleSystemRef.current) {
      bubbleSystemRef.current.add_bubble(
        msg.character_id,
        msg.message,
        {
          type: 'speech',
          emotion: 'neutral',
          duration: 12000
        }
      );
    }
  };

  const sendRandomMessage = () => {
    if (testMessages.length === 0) return;
    const randomIndex = Math.floor(Math.random() * testMessages.length);
    sendTestMessage(randomIndex);
  };

  const sendAllMessages = () => {
    testMessages.forEach((_, index) => {
      setTimeout(() => sendTestMessage(index), index * 1000);
    });
  };

  if (is_loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading your characters...</div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-900">
        <div className="text-white text-xl mb-4">No characters with 3D models found</div>
        <div className="text-gray-400 text-sm">Please acquire some characters first!</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 border-2 border-purple-500 rounded-2xl p-8 max-w-2xl mx-4">
            <h1 className="text-4xl font-bold text-white mb-4 text-center">
              🎭 3D Visual Theater
            </h1>
            <h2 className="text-xl text-purple-300 mb-6 text-center">
              The Future of Chat in Blank Wars!
            </h2>

            <div className="space-y-4 text-gray-200 mb-6">
              <p className="text-lg">
                Welcome to the revolutionary 3D chat experience! This combines:
              </p>
              <ul className="space-y-2 ml-6">
                <li>✨ <strong>3D Character Models</strong> from Meshy AI</li>
                <li>💬 <strong>Comic Book Speech Bubbles</strong> floating above characters</li>
                <li>🎬 <strong>Cinematic Camera View</strong> from the perfect angle</li>
                <li>🎭 <strong>Character Animations</strong> (coming soon!)</li>
              </ul>

              <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg">
                <p className="font-semibold mb-2">How to Test:</p>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Click Character Buttons:</strong> Test individual character bubbles</li>
                  <li>• <strong>Random Message:</strong> Send a random character's message</li>
                  <li>• <strong>All Messages:</strong> Send all characters' messages in sequence</li>
                  <li>• <strong>Cinematic View:</strong> Fixed camera angle - just watch the show!</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all text-lg"
            >
              Enter the Theater 🎭
            </button>
          </div>
        </div>
      )}

      {/* 3D Theater */}
      <ChatTheater3D
        ref={bubbleSystemRef}
        context_type="simple_chat"
        participants={participants}
        is_enabled={true}
        class_name="w-full h-full"
      />

      {/* Test Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-4xl">
        <button
          onClick={sendRandomMessage}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-lg transition-all"
        >
          🎲 Random Message
        </button>
        <button
          onClick={sendAllMessages}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg transition-all"
        >
          💬 All Messages
        </button>
        <button
          onClick={() => bubbleSystemRef.current?.clear_all_bubbles()}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg shadow-lg transition-all"
        >
          🗑️ Clear
        </button>
        <button
          onClick={() => setShowInstructions(true)}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-lg transition-all"
        >
          ℹ️ Help
        </button>
      </div>

      {/* Individual Character Test Buttons */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-4xl">
        {testMessages.map((msg, index) => (
          <button
            key={msg.character_id}
            onClick={() => sendTestMessage(index)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg shadow transition-all"
          >
            {participants[index].character_avatar} {participants[index].character_name}
          </button>
        ))}
      </div>

      {/* Auth status banner */}
      {!is_authenticated && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 bg-opacity-90 text-white px-6 py-3 rounded-lg text-sm shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span>🎭</span>
            <div>
              <div className="font-semibold">Viewing Test Characters</div>
              <div className="text-xs text-blue-200">
                <Link href="/login-test" className="underline hover:text-white">
                  Log in
                </Link> to see your own characters in 3D!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
