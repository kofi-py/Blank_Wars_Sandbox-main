'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { characterService } from '@/services/characterService';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import { Star, CheckCircle, Sparkles } from 'lucide-react';
import { getCharacterImagePath } from '@/utils/characterImageUtils';

interface StarterCharacter {
  id: string;
  name: string;
  archetype: string;
  rarity: string;
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  contestant: { label: 'Contestant', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  mascot: { label: 'Mascot', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  judge: { label: 'Judge', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  therapist: { label: 'Therapist', color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  trainer: { label: 'Trainer', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  host: { label: 'Host', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  real_estate_agent: { label: 'Real Estate Agent', color: 'text-green-400', bgColor: 'bg-green-500/20' }
};

export default function PostRegistrationFlow() {
  const { user, show_onboarding, set_show_onboarding } = useAuth();
  const [showingPackAnimation, setShowingPackAnimation] = useState(false);
  const [showingPackOpening, setShowingPackOpening] = useState(false);
  const [starterCharacters, setStarterCharacters] = useState<StarterCharacter[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    if (show_onboarding && user) {
      // Start with pack animation
      setShowingPackAnimation(true);
      fetchStarterCharacters();
    }
  }, [show_onboarding, user]);

  const fetchStarterCharacters = async (retryCount = 0) => {
    try {
      // Fetch contestants and all system characters in parallel
      const [contestants, mascots, judges, therapists, trainers, hosts, realEstateAgents] = await Promise.all([
        characterService.get_user_characters(),
        characterService.get_system_characters('mascot'),
        characterService.get_system_characters('judge'),
        characterService.get_system_characters('therapist'),
        characterService.get_system_characters('trainer'),
        characterService.get_system_characters('host'),
        characterService.get_system_characters('real_estate_agent')
      ]);

      // Combine all system characters
      const allSystemChars = [...mascots, ...judges, ...therapists, ...trainers, ...hosts, ...realEstateAgents];

      console.log('🔍 POST-REG: Contestants:', contestants.length);
      console.log('🔍 POST-REG: System characters:', allSystemChars.length);

      // Map contestants
      const mappedContestants: StarterCharacter[] = contestants.map((char: any) => ({
        id: char.id,
        name: char.name,
        archetype: char.archetype,
        rarity: char.rarity,
        role: char.role
      }));

      // Map system characters
      const mappedSystemChars: StarterCharacter[] = allSystemChars.map((char: any) => ({
        id: char.id,
        name: char.name,
        archetype: char.archetype,
        rarity: char.rarity,
        role: char.role
      }));

      const allCharacters = [...mappedContestants, ...mappedSystemChars];
      console.log('🔍 POST-REG: Total characters:', allCharacters.length);

      // STRICT MODE: Validate we got expected characters, but still show animation
      if (allCharacters.length === 0) {
        throw new Error('STRICT MODE: No characters found after registration');
      }

      if (allCharacters.length !== 9) {
        console.error(`⚠️ POST-REG: Expected 9 characters (3 contestants + 6 system), got ${allCharacters.length}`);
        console.error(`⚠️ POST-REG: Contestants: ${mappedContestants.length}, System: ${mappedSystemChars.length}`);
        // Still show animation with whatever characters we have
      }

      setStarterCharacters(allCharacters);

      // After 2 seconds, move to pack opening
      setTimeout(() => {
        setShowingPackAnimation(false);
        setShowingPackOpening(true);
      }, 2000);
    } catch (error) {
      console.error('Failed to fetch starter characters:', error);

      // Retry up to 3 times with increasing delay to handle auth timing issues
      if (retryCount < 3) {
        console.log(`Retrying character fetch... attempt ${retryCount + 1}`);
        setTimeout(() => {
          fetchStarterCharacters(retryCount + 1);
        }, 1000 + (retryCount * 1000)); // 1s, 2s, 3s delays
      } else {
        console.error('All retry attempts failed, completing flow without showing characters');
        // Complete the flow even if we can't show characters after all retries
        completeFlow();
      }
    }
  };

  const handleCardReveal = () => {
    if (currentCardIndex < starterCharacters.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      completeFlow();
    }
  };

  const completeFlow = () => {
    setShowingPackAnimation(false);
    setShowingPackOpening(false);
    set_show_onboarding(false);
  };

  if (!user || !show_onboarding) return null;

  return (
    <>
      {/* Pack Animation */}
      <AnimatePresence>
        {showingPackAnimation && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          >
            <SafeMotion
              as="div"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5 }}
              class_name="text-center"
            >
              <div className="text-8xl mb-4">📦</div>
              <h3 className="text-3xl font-bold text-white mb-2">
                Starter Pack
              </h3>
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                <span className="text-xl text-yellow-400">Opening...</span>
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Card Reveal */}
      <AnimatePresence>
        {showingPackOpening && starterCharacters.length > 0 && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center z-50"
          >
            <div className="text-center">
              <SafeMotion
                as="div"
                key={currentCardIndex}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                class_name="mb-8 bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm mx-auto"
              >
                {/* Role Badge */}
                {(() => {
                  const currentChar = starterCharacters[currentCardIndex];
                  const roleConfig = ROLE_CONFIG[currentChar.role];
                  if (!roleConfig) {
                    console.error(`Unknown role: ${currentChar.role} for character ${currentChar.name}`);
                    return (
                      <div className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 bg-red-500/20 text-red-400">
                        UNKNOWN ROLE: {currentChar.role}
                      </div>
                    );
                  }
                  return (
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${roleConfig.bgColor} ${roleConfig.color}`}>
                      {roleConfig.label}
                    </div>
                  );
                })()}

                {/* Character Image */}
                <div className="w-40 h-48 mx-auto mb-4 rounded-lg overflow-hidden border-2 border-gray-600">
                  <img
                    src={getCharacterImagePath(starterCharacters[currentCardIndex].name, 'team')}
                    alt={starterCharacters[currentCardIndex].name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/characters/default-character.jpg';
                    }}
                  />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  {starterCharacters[currentCardIndex].name}
                </h3>
                <p className="text-gray-400 mb-4 capitalize">
                  {starterCharacters[currentCardIndex].archetype}
                </p>
                <div className="flex justify-center mb-4">
                  {(() => {
                    const rarity = starterCharacters[currentCardIndex].rarity;
                    const starCounts: Record<string, number> = {
                      legendary: 4,
                      epic: 3,
                      rare: 2,
                      uncommon: 1,
                      common: 1
                    };
                    const starCount = starCounts[rarity];
                    if (starCount === undefined) {
                      console.error(`Unknown rarity: ${rarity} for character ${starterCharacters[currentCardIndex].name}`);
                      return <span className="text-red-400">UNKNOWN RARITY: {rarity}</span>;
                    }
                    return Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${i < starCount ? 'text-yellow-400 fill-current' : 'text-gray-500'}`}
                      />
                    ));
                  })()}
                </div>
                <p className="text-lg text-gray-300 capitalize mb-4">
                  {starterCharacters[currentCardIndex].rarity}
                </p>
                <div className="bg-green-900/30 border border-green-500/50 rounded p-3">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                    <span className="text-green-400">Added to Your Collection!</span>
                  </div>
                </div>
              </SafeMotion>

              <div className="text-white mb-4">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleCardReveal}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    {currentCardIndex < starterCharacters.length - 1 ? 'Next Character' : 'Start Your Adventure!'}
                  </button>
                </div>
              </div>

              <div className="mt-4 text-gray-400">
                Character {currentCardIndex + 1} of {starterCharacters.length}
              </div>
            </div>
          </SafeMotion>
        )}
      </AnimatePresence>
    </>
  );
}