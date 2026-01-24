'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TradingCard from './TradingCard';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { mergePowersAndSpellsIntoAbilities } from '@/utils/characterConversion';
import { Sparkles, Gift, X, Star, Zap } from 'lucide-react';
import { packService } from '@/services/packService';
import { characterAPI } from '@/services/apiClient';
import { Contestant } from '@blankwars/types';

interface CardPack {
  id: string;
  name: string;
  description: string;
  card_count: number;
  price: number;
  guaranteed_rarity?: 'rare' | 'epic' | 'legendary';
  pack_art: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface CardPackOpeningProps {
  is_open: boolean;
  onClose: () => void;
  onCardsReceived: (cards: TeamCharacter[]) => void;
  available_cards: TeamCharacter[];
  player_currency: number;
  onCurrencySpent: (amount: number) => void;
  onEchoesReceived?: (echoes: { character_id: string; count: number }[]) => void;
}

const CARD_PACKS: CardPack[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    description: 'Perfect for beginners. 3 cards with guaranteed rare.',
    card_count: 3,
    price: 100,
    guaranteed_rarity: 'rare',
    pack_art: '📦',
    rarity: 'common'
  },
  {
    id: 'warrior',
    name: 'Warrior Pack',
    description: 'Combat-focused characters. 5 cards with guaranteed epic.',
    card_count: 5,
    price: 250,
    guaranteed_rarity: 'epic',
    pack_art: '⚔️',
    rarity: 'rare'
  },
  {
    id: 'legendary',
    name: 'Legendary Pack',
    description: 'Premium collection. 7 cards with guaranteed legendary.',
    card_count: 7,
    price: 500,
    guaranteed_rarity: 'legendary',
    pack_art: '👑',
    rarity: 'epic'
  },
  {
    id: 'mythic',
    name: 'Mythic Pack',
    description: 'Ultimate collection. 10 cards with multiple legendaries.',
    card_count: 10,
    price: 1000,
    guaranteed_rarity: 'legendary',
    pack_art: '🌟',
    rarity: 'legendary'
  }
];

export default function CardPackOpening({
  is_open,
  onClose,
  onCardsReceived,
  player_currency,
  onCurrencySpent,
  onEchoesReceived
}: CardPackOpeningProps) {
  const [selectedPack, setSelectedPack] = useState<CardPack | null>(null);
  const [is_opening, setIsOpening] = useState(false);
  const [revealedCards, setRevealedCards] = useState<TeamCharacter[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showPackAnimation, setShowPackAnimation] = useState(false);
  const [echoesGained, setEchoesGained] = useState<{ character_id: string; count: number }[]>([]);
  const [showingEchoes, setShowingEchoes] = useState(false);
  const [userCharacters, setUserCharacters] = useState<Contestant[]>([]);

  // Fetch user characters from database on mount
  useEffect(() => {
    const loadCharacters = async () => {
      const characters = await characterAPI.get_user_characters();
      setUserCharacters(characters);
    };
    loadCharacters();
  }, []);

  const handlePackPurchase = async (pack: CardPack) => {
    if (player_currency < pack.price) return;

    setSelectedPack(pack);
    setShowPackAnimation(true);
    onCurrencySpent(pack.price);

    try {
      // Generate pack via backend
      const packType = packService.mapPackIdToType(pack.id);
      const generateResult = await packService.generatePack(packType);

      // Claim the pack immediately
      const claimResult = await packService.claimPack(generateResult.claim_token);

      // Get the real characters from DB that were just created
      const allUserCharacters = await characterAPI.get_user_characters();
      setUserCharacters(allUserCharacters);

      // Find the newly granted characters
      const newCards: TeamCharacter[] = [];
      for (const charId of claimResult.granted_characters) {
        const dbCharacter = allUserCharacters.find(c => c.character_id === charId);
        if (dbCharacter) {
          // Convert DB character to TeamCharacter for display
          const teamChar: TeamCharacter = {
            id: dbCharacter.id,
            character_id: dbCharacter.character_id,
            name: dbCharacter.name,
            avatar: dbCharacter.avatar_emoji!,
            archetype: dbCharacter.archetype as TeamCharacter['archetype'],
            rarity: dbCharacter.rarity as TeamCharacter['rarity'],
            level: dbCharacter.level,
            experience: dbCharacter.experience,
            experience_to_next: dbCharacter.experience_to_next,
            strength: dbCharacter.strength,
            defense: dbCharacter.defense,
            speed: dbCharacter.speed,
            dexterity: dbCharacter.dexterity,
            intelligence: dbCharacter.intelligence,
            charisma: dbCharacter.charisma,
            spirit: dbCharacter.spirit,
            wisdom: dbCharacter.wisdom,
            current_health: dbCharacter.current_health,
            max_health: dbCharacter.max_health,
            current_mana: dbCharacter.current_mana,
            max_mana: dbCharacter.max_mana,
            current_energy: dbCharacter.current_energy,
            max_energy: dbCharacter.max_energy,
            psych_stats: dbCharacter.psych_stats,
            gameplan_adherence: dbCharacter.gameplan_adherence,
            current_stress: dbCharacter.current_stress,
            team_trust: dbCharacter.team_trust,
            current_mental_health: dbCharacter.current_mental_health,
            battle_focus: dbCharacter.battle_focus,
            current_confidence: dbCharacter.current_confidence,
            temporary_stats: {
              strength: 0,
              dexterity: 0,
              defense: 0,
              intelligence: 0,
              wisdom: 0,
              charisma: 0,
              spirit: 0,
              speed: 0
            },
            personality_traits: [],
            speaking_style: 'casual',
            decision_making: 'logical',
            conflict_response: 'diplomatic',
            status_effects: [],
            injuries: [],
            rest_days_needed: 0,
            buffs: [],
            debuffs: [],
            relationship_modifiers: dbCharacter.relationship_modifiers ?? (() => { throw new Error('Missing relationship_modifiers for character ' + dbCharacter.id); })(),
            abilities: mergePowersAndSpellsIntoAbilities(dbCharacter),
            special_powers: [],
            powers: (dbCharacter.powers || []) as any,
            spells: (dbCharacter.spells || []) as any,
            equipped_powers: (dbCharacter.equipped_powers || []) as any,
            equipped_spells: (dbCharacter.equipped_spells || []) as any,
            equipped_items: {
              weapon: undefined,
              armor: undefined,
              accessory: undefined
            },
            equipment_bonuses: {
              atk: 0,
              def: 0,
              spd: 0,
              hp: 0,
              crit_rate: 0,
              crit_damage: 0,
              accuracy: 0,
              evasion: 0,
              energy_regen: 0,
              xp_bonus: 0
            },
            core_skills: {
              combat: { level: Math.max(1, Math.floor(dbCharacter.level * 0.8)), experience: 0, max_level: 999 },
              survival: { level: Math.max(1, Math.floor(dbCharacter.level * 0.6)), experience: 0, max_level: 999 },
              mental: { level: Math.max(1, Math.floor(dbCharacter.level * 0.7)), experience: 0, max_level: 999 },
              social: { level: Math.max(1, Math.floor(dbCharacter.level * 0.5)), experience: 0, max_level: 999 },
              spiritual: { level: Math.max(1, Math.floor(dbCharacter.level * 0.4)), experience: 0, max_level: 999 }
            },
            title: dbCharacter.title,
            // Battle Image Data (Required from DB)
            battle_image_name: dbCharacter.battle_image_name || dbCharacter.name, // Fallback only if type is optional, but DB enforces it
            battle_image_variants: dbCharacter.battle_image_variants || 7
          };
          newCards.push(teamChar);
        }
      }

      setRevealedCards(newCards);
      setEchoesGained(claimResult.echoes_gained);

      // If we received echoes, show them after cards
      if (claimResult.echoes_gained.length > 0 && onEchoesReceived) {
        onEchoesReceived(claimResult.echoes_gained);
      }

      setTimeout(() => {
        setIsOpening(true);
        setShowPackAnimation(false);
      }, 1500);
    } catch (error) {
      console.error('Error purchasing pack:', error);
      // On error, reset the purchase
      setSelectedPack(null);
      setShowPackAnimation(false);
      // Refund the currency (this is a simple approach)
      onCurrencySpent(-pack.price);
    }
  };

  const handleCardReveal = () => {
    if (currentCardIndex < revealedCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else if (echoesGained.length > 0 && !showingEchoes) {
      // Show echoes after all cards are revealed
      setShowingEchoes(true);
    } else {
      // All cards and echoes revealed
      onCardsReceived(revealedCards);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedPack(null);
    setIsOpening(false);
    setRevealedCards([]);
    setCurrentCardIndex(0);
    setShowPackAnimation(false);
    setEchoesGained([]);
    setShowingEchoes(false);
    onClose();
  };

  const getPackRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Card Packs</h2>
                <p className="text-purple-100">
                  Currency: {player_currency} coins
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Pack Animation */}
          <AnimatePresence>
            {showPackAnimation && selectedPack && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-60"
              >
                <motion.div
                  initial={{ scale: 0.5, rotateY: 0 }}
                  animate={{
                    scale: [0.5, 1.2, 1],
                    rotateY: [0, 360],
                    transition: { duration: 1.5 }
                  }}
                  className="text-center"
                >
                  <div className={`text-8xl mb-4 filter drop-shadow-lg`}>
                    {selectedPack.pack_art}
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {selectedPack.name}
                  </h3>
                  <div className="flex items-center justify-center gap-1">
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                    <span className="text-xl text-yellow-400">Opening...</span>
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card Reveal */}
          <AnimatePresence>
            {is_opening && revealedCards.length > 0 && !showingEchoes && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center z-60"
              >
                <div className="text-center">
                  <motion.div
                    key={currentCardIndex}
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{
                      scale: 1,
                      rotateY: 0,
                      transition: { type: "spring", stiffness: 100 }
                    }}
                    className="mb-8"
                  >
                    <TradingCard
                      character={revealedCards[currentCardIndex]}
                      size="large"
                      showStats={true}
                    />
                  </motion.div>

                  <div className="text-white mb-4">
                    <h3 className="text-2xl font-bold mb-2">
                      {revealedCards[currentCardIndex].name}
                    </h3>
                    <div className="flex items-center justify-center gap-1 mb-4">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-6 h-6 ${i < (revealedCards[currentCardIndex].rarity === 'mythic' ? 5 :
                            revealedCards[currentCardIndex].rarity === 'legendary' ? 4 :
                              revealedCards[currentCardIndex].rarity === 'epic' ? 3 :
                                revealedCards[currentCardIndex].rarity === 'rare' ? 2 : 1)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-500'
                            }`}
                        />
                      ))}
                    </div>
                    <p className="text-lg text-gray-300 capitalize">
                      {revealedCards[currentCardIndex].rarity} {revealedCards[currentCardIndex].archetype}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handleCardReveal}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      {currentCardIndex < revealedCards.length - 1 ? 'Next Card' :
                        echoesGained.length > 0 ? 'View Echoes' : 'Finish'}
                    </button>
                  </div>

                  <div className="mt-4 text-gray-400">
                    Card {currentCardIndex + 1} of {revealedCards.length}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Echo Display */}
          <AnimatePresence>
            {is_opening && showingEchoes && echoesGained.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center z-60"
              >
                <div className="text-center max-w-2xl mx-auto p-8">
                  <motion.div
                    initial={{ scale: 0, y: 50 }}
                    animate={{
                      scale: 1,
                      y: 0,
                      transition: { type: "spring", stiffness: 100 }
                    }}
                    className="mb-8"
                  >
                    <div className="flex items-center justify-center mb-4">
                      <Zap className="w-16 h-16 text-yellow-400 animate-pulse" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">
                      Character Echoes Received!
                    </h2>
                    <p className="text-xl text-amber-200 mb-8">
                      You already own these characters, so they&apos;ve been converted to powerful Echoes!
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {echoesGained.map((echo, index) => {
                      const character = userCharacters.find(c => c.character_id === echo.character_id);
                      if (!character) {
                        throw new Error(`Character ${echo.character_id} not found in database`);
                      }
                      return (
                        <motion.div
                          key={echo.character_id}
                          initial={{ scale: 0, rotateX: 90 }}
                          animate={{
                            scale: 1,
                            rotateX: 0,
                            transition: {
                              delay: index * 0.2,
                              type: "spring",
                              stiffness: 100
                            }
                          }}
                          className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-6"
                        >
                          <div className="flex items-center justify-center mb-3">
                            <Zap className="w-8 h-8 text-yellow-400 mr-2" />
                            <span className="text-2xl font-bold text-white">
                              {echo.count}x
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {character.name}
                          </h3>
                          <p className="text-amber-200 text-sm">
                            {character.archetype} Echo{echo.count > 1 ? 's' : ''}
                          </p>
                          <div className="mt-3 text-xs text-amber-300">
                            Use to ascend or upgrade abilities!
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handleCardReveal}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      Finish
                    </button>
                  </div>

                  <div className="mt-4 text-amber-300">
                    Echoes gained from duplicate characters
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pack Selection */}
          {!selectedPack && !is_opening && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CARD_PACKS.map((pack) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className={`
                    relative overflow-hidden rounded-xl shadow-lg cursor-pointer
                    ${player_currency >= pack.price ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}
                  `}
                  onClick={() => player_currency >= pack.price && handlePackPurchase(pack)}
                >
                  <div className={`bg-gradient-to-br ${getPackRarityColor(pack.rarity)} p-6 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">{pack.pack_art}</div>
                      <div className="text-2xl font-bold">{pack.price} 💰</div>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{pack.name}</h3>
                    <p className="text-white/90 mb-4">{pack.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <span>{pack.card_count} cards</span>
                      {pack.guaranteed_rarity && (
                        <span className="bg-white/20 px-2 py-1 rounded-full">
                          Guaranteed {pack.guaranteed_rarity}
                        </span>
                      )}
                    </div>
                  </div>

                  {player_currency < pack.price && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-black/80 text-white px-4 py-2 rounded-lg">
                        Need {pack.price - player_currency} more coins
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
