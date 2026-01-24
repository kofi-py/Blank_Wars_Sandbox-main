'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getBattleImageWithFallback,
  getRandomBattleImage,
  BATTLE_ANIMATION_CONFIG,
  type BattleAnimationType
} from '@/utils/battleImageMapper';
import { imagePreloader } from '@/utils/imagePreloader';

import { type TeamCharacter } from '@/data/teamBattleSystem';

interface BattleAnimationDisplayProps {
  fighter1: TeamCharacter;
  fighter2: TeamCharacter;
  current_round: number;
  is_animating: boolean;
  animation_type?: BattleAnimationType;
  on_animation_complete: () => void;
  on_round_complete: () => void;
  class_name?: string;
}

interface AnimationFrame {
  image_path: string;
  index: number;
}

export default function BattleAnimationDisplay({
  fighter1,
  fighter2,
  current_round,
  is_animating,
  animation_type = 'fadeIn',
  on_animation_complete,
  on_round_complete,
  class_name = ''
}: BattleAnimationDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentAnimationFrame, setCurrentAnimationFrame] = useState<AnimationFrame | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Generate animation sequence for current round
  const generateAnimationFrames = useCallback((): AnimationFrame[] => {
    const frames: AnimationFrame[] = [];
    const { images_per_round } = BATTLE_ANIMATION_CONFIG;

    for (let i = 0; i < images_per_round; i++) {
      // Use round + frame index to get different images
      const imageNumber = ((current_round - 1) * images_per_round + i + 1);
      const image_path = getBattleImageWithFallback(fighter1, fighter2, imageNumber);

      frames.push({
        image_path,
        index: i
      });
    }

    return frames;
  }, [fighter1, fighter2, current_round]);

  // Preload images for smooth animation using the efficient preloader
  const preloadImages = useCallback(async (frames: AnimationFrame[]) => {
    const imageUrls = frames.map(frame => frame.image_path);

    const successfulUrls = await imagePreloader.preloadImages(imageUrls, {
      onProgress: (loaded, total) => {
        console.log(`Preloading battle images: ${loaded}/${total}`);
      },
      onError: (failedUrls) => {
        console.warn('Failed to preload some battle images:', failedUrls);
      }
    });

    setPreloadedImages(new Set(successfulUrls));
  }, []);

  // Start animation sequence
  const startAnimationSequence = useCallback(async () => {
    if (!is_animating || !fighter1 || !fighter2) return;

    const frames = generateAnimationFrames();

    // Preload images first
    await preloadImages(frames);

    // Animate through each frame
    for (let i = 0; i < frames.length; i++) {
      setCurrentImageIndex(i);
      setCurrentAnimationFrame(frames[i]);
      setImageLoadError(false);

      // Wait for frame duration
      await new Promise(resolve =>
        setTimeout(resolve, BATTLE_ANIMATION_CONFIG.image_duration)
      );
    }

    // Round complete
    on_round_complete();

    // Animation sequence complete
    on_animation_complete();

  }, [is_animating, fighter1, fighter2, generateAnimationFrames, preloadImages, on_round_complete, on_animation_complete]);

  // Start animation when conditions are met
  useEffect(() => {
    if (is_animating && fighter1 && fighter2) {
      startAnimationSequence();
    }
  }, [is_animating, fighter1, fighter2, current_round, startAnimationSequence]);

  // Animation variants for different effects
  const getAnimationVariants = (type: BattleAnimationType) => {
    const baseVariants = {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    };

    switch (type) {
      case 'slideLeft':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -100 }
        };
      case 'slideRight':
        return {
          initial: { opacity: 0, x: -100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 100 }
        };
      case 'zoomIn':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.2 }
        };
      default:
        return baseVariants;
    }
  };

  // Handle image load error
  const handleImageError = () => {
    setImageLoadError(true);
    console.warn(`Battle image failed to load: ${currentAnimationFrame?.image_path}`);
  };

  // If no valid fighters, show placeholder
  if (!fighter1 || !fighter2) {
    return (
      <div className={`flex items-center justify-center bg-gray-900/50 rounded-lg border border-gray-700 ${class_name}`}>
        <div className="text-gray-400 text-center p-8">
          <div className="text-6xl mb-4">⚔️</div>
          <div className="text-lg font-semibold">ColosSEAum Arena</div>
          <div className="text-sm">Select fighters to begin battle</div>
        </div>
      </div>
    );
  }

  // Get fallback image if animation not running
  const staticImage = !is_animating ? getRandomBattleImage(fighter1, fighter2) : null;

  return (
    <div className={`relative overflow-hidden bg-black rounded-lg border-2 border-blue-500/50 shadow-2xl ${class_name}`}>
      {/* Arena Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="text-sm font-semibold">ColosSEAum Arena</div>
          <div className="text-xs bg-blue-600/20 px-2 py-1 rounded">
            Round {current_round}/3
          </div>
        </div>
      </div>

      {/* Battle Animation Content */}
      <div className="relative w-full h-full min-h-[400px]">
        <AnimatePresence mode="wait">
          {is_animating && currentAnimationFrame && !imageLoadError ? (
            <motion.div
              key={`${fighter1.id}-${fighter2.id}-${current_round}-${currentImageIndex}`}
              variants={getAnimationVariants(animation_type)}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{
                duration: BATTLE_ANIMATION_CONFIG.transition_duration / 1000,
                ease: "easeInOut"
              }}
              className="absolute inset-0"
            >
              <img
                src={currentAnimationFrame.image_path}
                alt={`Battle Round ${current_round} - Frame ${currentAnimationFrame.index + 1}`}
                className="w-full h-full object-cover"
                onError={handleImageError}
                loading="eager"
              />

              {/* Action Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30">
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between text-white">
                    <div className="text-sm font-semibold bg-black/50 px-3 py-1 rounded">
                      Frame {currentImageIndex + 1} of {BATTLE_ANIMATION_CONFIG.images_per_round}
                    </div>
                    <div className="text-xs text-gray-300">
                      {is_animating ? 'LIVE BATTLE' : 'READY'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : staticImage && !is_animating ? (
            // Static image when not animating
            <motion.div
              key={`static-${fighter1.id}-${fighter2.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0"
            >
              <img
                src={staticImage}
                alt={`Battle Preview`}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20">
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-center text-white">
                    <div className="text-lg font-bold bg-black/50 px-4 py-2 rounded">
                      Ready for Battle
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            // Fallback/Error state
            <motion.div
              key="fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900/20 to-purple-900/20"
            >
              <div className="text-center text-white">
                <div className="text-8xl mb-4">⚔️</div>
                <div className="text-2xl font-bold mb-2">Epic Battle in Progress</div>
                <div className="text-lg text-blue-300">Round {current_round}</div>
                {imageLoadError && (
                  <div className="text-sm text-red-300 mt-2">
                    Loading battle sequence...
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animation Progress Indicator */}
      {is_animating && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
          <div className="flex space-x-1">
            {Array.from({ length: BATTLE_ANIMATION_CONFIG.images_per_round }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded ${i <= currentImageIndex ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}