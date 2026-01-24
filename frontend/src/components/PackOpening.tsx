'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SafeMotion } from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { Package, Star, Sparkles, RotateCcw, ShoppingCart } from 'lucide-react';
import { paymentAPI, characterAPI } from '../services/apiClient';
import { useRouter, useSearchParams } from 'next/navigation';

interface Card {
  id: string; // Changed to string for character ID
  name: string;
  title: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'; // Added mythic
  avatar: string;
  is_new: boolean;
  serial_number?: string; // Added serialNumber
  stats?: {
    attack: number;
    defense: number;
    speed: number;
  };
}

interface EchoGained {
  character_id: string;
  count: number;
}

interface PackType {
  id: string;
  name: string;
  price: number;
  card_count: number;
  guaranteed: string;
  avatar: string;
  gradient: string;
}

const PACK_TYPES: PackType[] = [
  {
    id: 'demo',
    name: 'Free Demo Pack',
    price: 0,
    card_count: 3,
    guaranteed: '3 Random Characters',
    avatar: '🎮',
    gradient: 'from-green-500 to-teal-500'
  }
  // TODO: Add paid packs after demo phase
  // {
  //   id: 'starter',
  //   name: 'Starter Pack',
  //   price: 2.99,
  //   card_count: 5,
  //   guaranteed: '1 Guaranteed Uncommon',
  //   avatar: '📦',
  //   gradient: 'from-blue-600 to-purple-600'
  // },
  // {
  //   id: 'premium',
  //   name: 'Premium Pack',
  //   price: 5.99,
  //   card_count: 8,
  //   guaranteed: '1 Guaranteed Rare',
  //   avatar: '🎁',
  //   gradient: 'from-purple-600 to-pink-600'
  // },
  // {
  //   id: 'legendary',
  //   name: 'Legendary Pack',
  //   price: 12.99,
  //   card_count: 10,
  //   guaranteed: '1 Guaranteed Epic',
  //   avatar: '👑',
  //   gradient: 'from-yellow-500 to-orange-500'
  // }
];



const getRarityColor = (rarity: Card['rarity']) => {
  const colors = {
    common: 'border-gray-500 bg-gray-800',
    uncommon: 'border-green-500 bg-green-900/20',
    rare: 'border-blue-500 bg-blue-900/20',
    epic: 'border-purple-500 bg-purple-900/20',
    legendary: 'border-yellow-500 bg-yellow-900/20',
    mythic: 'border-red-500 bg-red-900/20'
  };
  return colors[rarity];
};

const getRarityGlow = (rarity: Card['rarity']) => {
  const glows = {
    common: '',
    uncommon: 'shadow-lg shadow-green-500/25',
    rare: 'shadow-lg shadow-blue-500/25',
    epic: 'shadow-lg shadow-purple-500/25 animate-pulse',
    legendary: 'shadow-xl shadow-yellow-500/50 animate-pulse',
    mythic: 'shadow-2xl shadow-red-500/75 animate-pulse'
  };
  return glows[rarity];
};

export default function PackOpening() {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
  const [phase, setPhase] = useState<'selection' | 'opening' | 'revealing' | 'summary'>('selection');
  const [cards, setCards] = useState<Card[]>([]);
  const [echoes, setEchoes] = useState<EchoGained[]>([]);
  const [revealedCards, setRevealedCards] = useState<string[]>([]); // Changed to string for serialNumber
  const [packAnimating, setPackAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session_id = searchParams.get('session_id');
    if (session_id) {
      // In a real app, you'd verify the session server-side
      // For this demo, we'll just assume success and move to opening phase
      setPhase('opening');
      // You might want to fetch the pack details based on the session ID here
      // For now, we'll rely on the user selecting a pack again or having it in state
      router.replace('/pack-opening'); // Clean URL
    }
  }, [searchParams, router]);

  const selectPack = (pack: PackType) => {
    setSelectedPack(pack);
    setPhase('opening');
    setError(null);
  };


  const revealCard = (serialNumber: string) => {
    if (revealedCards.includes(serialNumber)) return;

    setRevealedCards(prev => [...prev, serialNumber]);

    // If all cards revealed, show summary
    if (revealedCards.length + 1 === cards.length) {
      setTimeout(() => setPhase('summary'), 1000);
    }
  };

  const openPack = async () => {
    if (phase !== 'opening' || !selectedPack) return;

    setPackAnimating(true);
    setError(null);

    try {
      // Call API during animation
      console.log('🎯 Attempting to purchase pack:', selectedPack.id);
      const response = await paymentAPI.purchase_pack(selectedPack.id, 1);
      console.log('🎯 Pack purchase response:', response);

      if (response.success && (response.granted_characters || response.echoes_gained)) {
        // Store echoes gained
        setEchoes(response.echoes_gained || []);

        // Get the REAL characters from database that were just created
        const allUserCharacters = await characterAPI.get_user_characters();
        console.log('🔍 Loaded user characters from DB:', allUserCharacters.length);

        // Convert character IDs to proper card data using REAL backend character data
        const newCards = (response.granted_characters || []).map((charId: string, index: number) => {
          // Backend returns template IDs like 'space_cyborg', 'merlin', 'holmes'
          // Find the actual user_character that was just created
          const dbCharacter = allUserCharacters.find(c => c.character_id === charId);

          if (!dbCharacter) {
            console.error(`❌ Character ${charId} not found in database after pack opening!`);
            // This should never happen - backend creates the character before returning
            return {
              id: charId,
              name: charId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              title: 'Unknown Character',
              rarity: 'common' as const,
              avatar: '🎭',
              is_new: true,
              serial_number: `${selectedPack.id}-${Date.now()}-${index}`,
              stats: { attack: 0, defense: 0, speed: 0 }
            };
          }

          // Use REAL character data from database
          return {
            id: dbCharacter.id,
            name: dbCharacter.name,
            title: dbCharacter.title || 'Legendary Warrior',
            rarity: dbCharacter.rarity as Card['rarity'],
            avatar: dbCharacter.avatar_emoji || '⚔️',
            is_new: true,
            serial_number: `${selectedPack.id}-${Date.now()}-${index}`,
            stats: {
              attack: dbCharacter.attack,
              defense: dbCharacter.defense,
              speed: dbCharacter.speed
            }
          };
        });

        console.log('✅ Created cards from DB:', newCards.length, 'characters');
        setCards(newCards);

        // Transition to revealing phase after animation
        setTimeout(() => {
          console.log('🎭 Transitioning to revealing phase');
          setPhase('revealing');
          setPackAnimating(false);
        }, 2000); // Match the animation duration
      } else {
        setError(response.error || 'Failed to open pack. Please try again.');
        setPackAnimating(false);
      }
    } catch (err) {
      console.error('❌ Pack purchase error:', err);
      setError(err.message || 'Failed to open pack. Please try again.');
      setPackAnimating(false);
    }
  };

  const resetToSelection = () => {
    setSelectedPack(null);
    setPhase('selection');
    setCards([]);
    setEchoes([]);
    setRevealedCards([]);
    setPackAnimating(false);
    setError(null);
  };

  const openAnotherPack = () => {
    setPhase('selection');
    setCards([]);
    setEchoes([]);
    setRevealedCards([]);
    setPackAnimating(false);
    setError(null);
  };

  const calculateStats = () => {
    const totalCards = cards.length;
    const newCards = cards.filter(card => card.is_new).length;
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    let bestRarity: Card['rarity'] = 'common';

    cards.forEach(card => {
      if (rarities.indexOf(card.rarity) > rarities.indexOf(bestRarity)) {
        bestRarity = card.rarity;
      }
    });

    return { totalCards, newCards, bestRarity };
  };

  return (
    <div className="max-w-6xl mx-auto">
      {error && <div className="text-red-500 text-center mb-4">Error: {error}</div>}
      <AnimatePresence mode="wait">
        {/* Pack Selection */}
        {phase === 'selection' && (
          <SafeMotion
            as="div"
            key="selection"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
            class_name="text-center"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4 text-white">Choose Your Pack</h2>
              <p className="text-gray-300">Each pack contains legendary warriors waiting to join your collection!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PACK_TYPES.map((pack) => (
                <SafeMotion
                  as="div"
                  key={pack.id}
                  on_click={() => selectPack(pack)}
                  class_name="bg-black/40 rounded-xl p-6 border-2 border-gray-700 hover:border-purple-500 cursor-pointer transition-all backdrop-blur-sm"
                  while_hover={isMobile ? {} : { scale: 1.05, y: -10 }}
                  while_tap={isMobile ? { scale: 0.98 } : { scale: 0.95 }}
                  transition={{ duration: isMobile ? 0.1 : 0.3, type: isMobile ? 'tween' : 'spring' }}
                >
                  <div className={`w-32 h-40 mx-auto mb-4 bg-gradient-to-br ${pack.gradient} rounded-lg flex items-center justify-center text-6xl shadow-lg`}>
                    {pack.avatar}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{pack.name}</h3>
                  <p className="text-gray-400 text-sm mb-2">{pack.card_count} Cards • {pack.guaranteed}</p>
                  <p className="text-2xl font-bold text-green-400">${pack.price}</p>
                </SafeMotion>
              ))}
            </div>
          </SafeMotion>
        )}

        {/* Pack Opening */}
        {phase === 'opening' && selectedPack && (
          <SafeMotion
            as="div"
            key="opening"
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: isMobile ? 1 : 0.8 }}
            transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
            class_name="text-center"
          >
            <h2 className="text-3xl font-bold mb-8 text-white">{selectedPack.name}</h2>

            {/* Portal Animation Container */}
            <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
              {/* Portal Background (spinning ring) */}
              {packAnimating && (
                <SafeMotion
                  as="div"
                  initial={{ opacity: 0, scale: 0, rotate: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1.2,
                    rotate: 360
                  }}
                  transition={{
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.8 },
                    rotate: { duration: 2, repeat: Infinity, ease: "linear" }
                  }}
                  class_name="absolute inset-0 rounded-full border-8 opacity-80"
                  style={{
                    borderImage: `conic-gradient(from 0deg, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ef4444, #8b5cf6) 1`,
                    filter: 'blur(1px)'
                  }}
                />
              )}

              {/* Portal Inner Void */}
              {packAnimating && (
                <SafeMotion
                  as="div"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 0.9, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  class_name="absolute w-48 h-48 rounded-full bg-black"
                  style={{
                    boxShadow: `inset 0 0 60px #8b5cf6, 0 0 40px rgba(139, 92, 246, 0.5)`
                  }}
                />
              )}

              {/* Pack (transforms into portal) */}
              <SafeMotion
                as="div"
                class_name={`relative z-10 w-48 h-64 bg-gradient-to-br ${selectedPack.gradient} rounded-xl flex items-center justify-center text-8xl shadow-2xl cursor-pointer`}
                animate={packAnimating ? {
                  rotateY: 720,
                  scale: [1, 1.2, 0],
                  opacity: [1, 1, 0]
                } : {}}
                transition={{ duration: 2, ease: "easeInOut" }}
                on_click={!packAnimating ? openPack : undefined}
              >
                {selectedPack.avatar}
              </SafeMotion>

              {/* Portal Energy Particles */}
              {packAnimating && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <SafeMotion
                      key={i}
                      as="div"
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        x: Math.cos(i * 30 * Math.PI / 180) * 120,
                        y: Math.sin(i * 30 * Math.PI / 180) * 120
                      }}
                      transition={{
                        duration: 2,
                        delay: 0.5 + i * 0.1,
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                      class_name="absolute w-2 h-2 bg-purple-400 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        marginLeft: '-4px',
                        marginTop: '-4px',
                        boxShadow: '0 0 10px #8b5cf6'
                      }}
                    />
                  ))}
                </>
              )}
            </div>

            {!packAnimating && (
              <SafeMotion
                as="button"
                on_click={openPack}
                class_name="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-bold py-4 px-8 rounded-full text-xl transition-all shadow-lg"
                while_hover={isMobile ? {} : { scale: 1.05 }}
                while_tap={isMobile ? { scale: 0.98 } : { scale: 0.95 }}
                animate={isMobile ? {} : { scale: [1, 1.05, 1] }}
                transition={isMobile ? { duration: 0.1 } : { repeat: Infinity, duration: 2 }}
              >
                <Package className="w-6 h-6 inline mr-2" />
                OPEN PORTAL!
              </SafeMotion>
            )}

            {packAnimating && (
              <SafeMotion
                as="p"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                class_name="text-purple-400 text-lg font-bold"
              >
                ✨ Opening mystical portal... ✨
              </SafeMotion>
            )}
          </SafeMotion>
        )}

        {/* Card Revealing */}
        {phase === 'revealing' && (
          <SafeMotion
            as="div"
            key="revealing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
          >
            <SafeMotion
              as="div"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              class_name="text-3xl font-bold mb-8 text-center text-white"
            >
              ✨ Cards from the Portal! ✨
            </SafeMotion>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {cards.map((card, index) => (
                <SafeMotion
                  as="div"
                  key={card.serial_number || card.id}
                  initial={{
                    opacity: 0,
                    scale: 0.3,
                    y: -200,
                    x: 0,
                    rotateZ: Math.random() * 720 - 360
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    x: 0,
                    rotateZ: 0
                  }}
                  transition={{
                    delay: index * 0.3,
                    duration: 0.8,
                    type: "spring",
                    damping: 0.8,
                    stiffness: 100
                  }}
                  class_name="relative"
                >
                  <SafeMotion
                    as="div"
                    class_name={`w-full h-64 rounded-lg cursor-pointer transition-all ${getRarityColor(card.rarity)} ${getRarityGlow(card.rarity)}`}
                    style={{ transformStyle: isMobile ? 'flat' : 'preserve-3d' }}
                    animate={{ rotateY: revealedCards.includes(card.serial_number || '') ? (isMobile ? 0 : 180) : 0 }}
                    transition={{ duration: isMobile ? 0.3 : 0.8, type: isMobile ? 'tween' : 'spring' }}
                    on_click={() => revealCard(card.serial_number || '')}
                  >
                    {/* Card Back */}
                    <div className={`absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border-2 border-purple-500 flex items-center justify-center ${isMobile ? (revealedCards.includes(card.serial_number || '') ? 'opacity-0' : 'opacity-100') : 'backface-hidden'} transition-opacity duration-300`}>
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎴</div>
                        <div className="text-sm text-gray-300">Click to reveal!</div>
                      </div>
                    </div>

                    {/* Card Front */}
                    <div
                      className={`absolute inset-0 w-full h-full rounded-lg border-2 p-4 flex flex-col ${getRarityColor(card.rarity)} ${isMobile ? (revealedCards.includes(card.serial_number || '') ? 'opacity-100' : 'opacity-0') : 'backface-hidden'} transition-opacity duration-300`}
                      style={{ transform: isMobile ? 'none' : 'rotateY(180deg)' }}
                    >
                      {card.is_new && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          NEW!
                        </div>
                      )}

                      <div className="text-4xl mb-2 text-center">{card.avatar}</div>
                      <div className="text-sm font-bold text-white text-center mb-1">{card.name}</div>
                      <div className="text-xs text-gray-300 text-center mb-3">{card.title}</div>

                      {card.stats && (
                        <div className="text-xs text-gray-300 space-y-1 flex-1">
                          <div>ATK: {card.stats.attack}</div>
                          <div>DEF: {card.stats.defense}</div>
                          <div>SPD: {card.stats.speed}</div>
                        </div>
                      )}

                      <div className={`text-xs font-bold uppercase text-center py-1 px-2 rounded ${card.rarity === 'legendary' ? 'bg-yellow-600' : card.rarity === 'epic' ? 'bg-purple-600' : card.rarity === 'rare' ? 'bg-blue-600' : card.rarity === 'uncommon' ? 'bg-green-600' : 'bg-gray-600'}`}>
                        {card.rarity}
                      </div>
                    </div>
                  </SafeMotion>
                </SafeMotion>
              ))}
            </div>
          </SafeMotion>
        )}

        {/* Summary */}
        {phase === 'summary' && (
          <SafeMotion
            as="div"
            key="summary"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
            class_name="text-center"
          >
            <div className="bg-black/40 rounded-xl p-8 backdrop-blur-sm border border-gray-700">
              <h2 className="text-3xl font-bold mb-6 text-white">Pack Summary</h2>

              {/* Echo Notifications */}
              {echoes.length > 0 && (
                <div className="mb-8 p-4 bg-purple-900/30 rounded-lg border border-purple-500/50">
                  <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Echoes Gained!
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {echoes.map((echo) => {
                      const character = cards.find(c => c.id.startsWith(echo.character_id));
                      return (
                        <div key={echo.character_id} className="flex items-center bg-black/30 rounded-lg p-3">
                          <div className="text-2xl mr-3">{character?.avatar || '🎭'}</div>
                          <div>
                            <div className="text-white font-bold">{character?.name || echo.character_id}</div>
                            <div className="text-purple-300 text-sm">+{echo.count} Echo{echo.count > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-sm text-purple-200">
                    💡 Use echoes to upgrade your existing characters!
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {(() => {
                  const stats = calculateStats();
                  return (
                    <>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-purple-400">{stats.totalCards}</div>
                        <div className="text-gray-400">Total Cards</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-400">{stats.newCards}</div>
                        <div className="text-gray-400">New Cards</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-yellow-400 capitalize">{stats.bestRarity}</div>
                        <div className="text-gray-400">Best Pull</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-center gap-4">
                <SafeMotion
                  as="button"
                  on_click={openAnotherPack}
                  class_name="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-full transition-all"
                  while_hover={isMobile ? {} : { scale: 1.05 }}
                  while_tap={isMobile ? { scale: 0.98 } : { scale: 0.95 }}
                  transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
                >
                  <Package className="w-5 h-5 inline mr-2" />
                  Open Another Pack!
                </SafeMotion>

                <SafeMotion
                  as="button"
                  on_click={resetToSelection}
                  class_name="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-full transition-all"
                  while_hover={isMobile ? {} : { scale: 1.05 }}
                  while_tap={isMobile ? { scale: 0.98 } : { scale: 0.95 }}
                  transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
                >
                  <RotateCcw className="w-5 h-5 inline mr-2" />
                  Back to Packs
                </SafeMotion>
              </div>
            </div>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
