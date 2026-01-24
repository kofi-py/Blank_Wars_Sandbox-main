// DiceRoll - 3D dice roll display for combat
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type DiceType = 'd20' | 'd100' | 'd6' | 'd8' | 'd10' | 'd12';

export interface DiceRollData {
  id: string;
  roll: number;
  type: 'attack' | 'damage' | 'crit' | 'adherence';
  diceType?: DiceType;
  label?: string;
  isCrit?: boolean;
  isFail?: boolean;
  threshold?: number;
}

interface DiceRollProps {
  diceRolls: DiceRollData[];
}

// Classic D20 Icosahedron SVG - based on game-icons.net design (CC BY 3.0)
const D20Icon: React.FC<{
  value: number;
  color: string;
  size: number;
  isRolling: boolean;
  isCrit?: boolean;
  isFail?: boolean;
}> = ({ value, color, size, isRolling, isCrit, isFail }) => {
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 20) + 1);
      }, 60);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [isRolling, value]);

  const glowColor = isCrit ? '#fcd34d' : isFail ? '#f87171' : color;
  const textColor = isCrit ? '#000' : '#fff';

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      animate={isRolling ? {
        rotateY: [0, 360, 720],
        rotateX: [0, 180, 360],
      } : {}}
      transition={isRolling ? { duration: 1.2, ease: "easeOut" } : {}}
      style={{ filter: !isRolling ? `drop-shadow(0 0 15px ${glowColor})` : undefined }}
    >
      <defs>
        <linearGradient id={`d20-main-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="50%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`d20-light-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`d20-dark-${value}`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Main icosahedron body - simplified iconic shape */}
      <g>
        {/* Top triangle */}
        <polygon
          points="50,5 85,40 15,40"
          fill={`url(#d20-main-${value})`}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
        />
        {/* Light overlay on top */}
        <polygon
          points="50,5 85,40 15,40"
          fill={`url(#d20-light-${value})`}
        />

        {/* Left face */}
        <polygon
          points="15,40 50,50 8,70"
          fill={color}
          opacity="0.75"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />

        {/* Right face */}
        <polygon
          points="85,40 92,70 50,50"
          fill={color}
          opacity="0.65"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />

        {/* Center diamond face - main visible area */}
        <polygon
          points="15,40 85,40 50,50"
          fill={`url(#d20-main-${value})`}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />

        {/* Bottom left face */}
        <polygon
          points="8,70 50,50 35,95"
          fill={color}
          opacity="0.55"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
        />

        {/* Bottom right face */}
        <polygon
          points="92,70 65,95 50,50"
          fill={color}
          opacity="0.5"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
        />

        {/* Bottom center face */}
        <polygon
          points="35,95 65,95 50,50"
          fill={color}
          opacity="0.7"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />

        {/* Bottom edge */}
        <polygon
          points="35,95 65,95 50,98"
          fill={color}
          opacity="0.4"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />

        {/* Dark overlay for depth */}
        <polygon
          points="8,70 35,95 65,95 92,70 50,50"
          fill={`url(#d20-dark-${value})`}
        />
      </g>

      {/* Number - positioned in the center visible area */}
      <text
        x="50"
        y="42"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={displayValue >= 10 ? "22" : "26"}
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        style={{
          textShadow: isCrit
            ? '0 0 10px #fcd34d, 0 0 20px #f59e0b'
            : '1px 1px 2px rgba(0,0,0,0.8)'
        }}
      >
        {displayValue}
      </text>
    </motion.svg>
  );
};

// D100 Percentile die (decagon shape)
const D100Icon: React.FC<{
  value: number;
  color: string;
  size: number;
  isRolling: boolean;
  passed?: boolean;
  failed?: boolean;
}> = ({ value, color, size, isRolling, passed, failed }) => {
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 100) + 1);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [isRolling, value]);

  const actualColor = passed ? '#22c55e' : failed ? '#ef4444' : color;
  const glowColor = passed ? '#4ade80' : failed ? '#f87171' : color;

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      animate={isRolling ? {
        rotateY: [0, 360, 720],
        rotateZ: [0, 180, 360],
      } : {}}
      transition={isRolling ? { duration: 1.4, ease: "easeOut" } : {}}
      style={{ filter: !isRolling ? `drop-shadow(0 0 15px ${glowColor})` : undefined }}
    >
      <defs>
        <linearGradient id={`d100-grad-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={actualColor} />
          <stop offset="60%" stopColor={actualColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={actualColor} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Decagon (10-sided) outer shape */}
      <polygon
        points="50,3 80,13 97,40 97,60 80,87 50,97 20,87 3,60 3,40 20,13"
        fill={`url(#d100-grad-${value})`}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
      />

      {/* Inner highlight ring */}
      <polygon
        points="50,18 68,25 80,45 80,55 68,75 50,82 32,75 20,55 20,45 32,25"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      />

      {/* Top shine */}
      <ellipse cx="38" cy="28" rx="18" ry="10" fill="rgba(255,255,255,0.25)" />

      {/* Number */}
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={displayValue >= 100 ? "18" : displayValue >= 10 ? "22" : "26"}
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}
      >
        {displayValue}
      </text>
    </motion.svg>
  );
};

// True 3D D6 Cube with pips
const D6Cube: React.FC<{
  finalValue: number;
  isRolling: boolean;
  color: string;
  size: number;
}> = ({ finalValue, isRolling, color, size }) => {
  const halfSize = size / 2;

  const faceRotations: Record<number, { rotateX: number; rotateY: number }> = {
    1: { rotateX: 0, rotateY: 0 },
    2: { rotateX: 0, rotateY: 180 },
    3: { rotateX: 0, rotateY: -90 },
    4: { rotateX: 0, rotateY: 90 },
    5: { rotateX: -90, rotateY: 0 },
    6: { rotateX: 90, rotateY: 0 },
  };

  const finalRotation = faceRotations[finalValue] || faceRotations[1];

  // Pip positions for each face value
  const pipPositions: Record<number, Array<{ x: number; y: number }>> = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 28, y: 28 }, { x: 72, y: 72 }],
    3: [{ x: 28, y: 28 }, { x: 50, y: 50 }, { x: 72, y: 72 }],
    4: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
    5: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 50, y: 50 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
    6: [{ x: 28, y: 22 }, { x: 72, y: 22 }, { x: 28, y: 50 }, { x: 72, y: 50 }, { x: 28, y: 78 }, { x: 72, y: 78 }],
  };

  const renderFace = (faceValue: number, opacity: number) => (
    <div
      className="absolute flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${color} 0%, ${color}cc 100%)`,
        border: '3px solid rgba(255,255,255,0.5)',
        borderRadius: 10,
        boxShadow: `inset 0 3px 15px rgba(255,255,255,0.3), inset 0 -3px 15px rgba(0,0,0,0.3)`,
        opacity,
      }}
    >
      {/* Pips SVG */}
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {pipPositions[faceValue]?.map((pos, i) => (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r="10"
            fill="white"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
          />
        ))}
      </svg>
    </div>
  );

  return (
    <div style={{ perspective: '500px', width: size, height: size }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={isRolling ? {
          rotateX: [0, 360, 720, 1080, 1080 + finalRotation.rotateX],
          rotateY: [0, 270, 540, 810, 810 + finalRotation.rotateY],
          y: [0, -35, 0, -18, 0],
        } : {
          rotateX: finalRotation.rotateX,
          rotateY: finalRotation.rotateY,
        }}
        transition={isRolling ? {
          duration: 1.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        } : {
          duration: 0.4,
          type: "spring",
          stiffness: 200,
        }}
      >
        {/* 6 cube faces */}
        <div style={{ transform: `translateZ(${halfSize}px)` }}>{renderFace(1, 1)}</div>
        <div style={{ transform: `translateZ(-${halfSize}px) rotateY(180deg)` }}>{renderFace(6, 0.95)}</div>
        <div style={{ transform: `translateX(${halfSize}px) rotateY(90deg)` }}>{renderFace(3, 0.9)}</div>
        <div style={{ transform: `translateX(-${halfSize}px) rotateY(-90deg)` }}>{renderFace(4, 0.9)}</div>
        <div style={{ transform: `translateY(-${halfSize}px) rotateX(90deg)` }}>{renderFace(2, 0.95)}</div>
        <div style={{ transform: `translateY(${halfSize}px) rotateX(-90deg)` }}>{renderFace(5, 0.85)}</div>
      </motion.div>
    </div>
  );
};

// Main rolling dice component
const RollingDice: React.FC<{
  dice: DiceRollData;
  offsetX: number;
  offsetY: number;
}> = ({ dice, offsetX, offsetY }) => {
  const [isRolling, setIsRolling] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const diceType = dice.diceType || (dice.type === 'adherence' ? 'd100' : dice.type === 'damage' ? 'd6' : 'd20');
  const isAdherence = dice.type === 'adherence';
  const passed = isAdherence && dice.threshold !== undefined && dice.roll <= dice.threshold;
  const failed = isAdherence && dice.threshold !== undefined && dice.roll > dice.threshold;

  useEffect(() => {
    const rollDuration = diceType === 'd100' ? 1400 : 1200;
    const timeout = setTimeout(() => {
      setIsRolling(false);
      setTimeout(() => setShowResult(true), 350);
    }, rollDuration);
    return () => clearTimeout(timeout);
  }, [diceType]);

  // Color schemes
  const getColor = () => {
    if (dice.isCrit) return '#f59e0b'; // amber
    if (dice.isFail && dice.type === 'attack') return '#dc2626'; // red
    if (passed) return '#22c55e'; // green
    if (failed) return '#ef4444'; // red

    switch (diceType) {
      case 'd100': return '#8b5cf6'; // purple
      case 'd6': return '#10b981'; // emerald
      default: return '#3b82f6'; // blue
    }
  };

  const color = getColor();
  const size = diceType === 'd100' ? 95 : diceType === 'd6' ? 75 : 88;

  return (
    <motion.div
      className="absolute"
      style={{ left: offsetX, top: offsetY }}
      initial={{ opacity: 0, y: -180, scale: 0.6, rotate: -30 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.4, y: -80, rotate: 30 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
    >
      <div className="relative">
        {/* Ground shadow */}
        <motion.div
          className="absolute rounded-full bg-black/50 blur-lg"
          style={{
            width: size * 0.75,
            height: size * 0.22,
            left: '50%',
            bottom: -18,
            transform: 'translateX(-50%)',
          }}
          animate={isRolling ? {
            scale: [0.4, 1.3, 0.6, 1.1, 0.9],
            opacity: [0.2, 0.5, 0.25, 0.4, 0.35],
          } : { scale: 1, opacity: 0.45 }}
          transition={{ duration: 1.2 }}
        />

        {/* Outer glow effect */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 1.6,
            height: size * 1.6,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${color}55 0%, ${color}22 40%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          animate={!isRolling ? {
            opacity: [0.6, 1, 0.8],
            scale: [1, 1.15, 1.05]
          } : { opacity: 0.3 }}
          transition={{ duration: 0.5, repeat: !isRolling ? 2 : 0 }}
        />

        {/* Dice bounce wrapper */}
        <motion.div
          animate={isRolling ? {
            y: [0, -45, 0, -22, 0, -8, 0],
            rotateZ: [0, 12, -10, 8, -5, 3, 0],
          } : {}}
          transition={isRolling ? { duration: 1.2, ease: "easeOut" } : {}}
        >
          {diceType === 'd6' ? (
            <D6Cube
              finalValue={Math.min(6, Math.max(1, dice.roll))}
              isRolling={isRolling}
              color={color}
              size={size}
            />
          ) : diceType === 'd100' ? (
            <D100Icon
              value={dice.roll}
              color={color}
              size={size}
              isRolling={isRolling}
              passed={passed}
              failed={failed}
            />
          ) : (
            <D20Icon
              value={dice.roll}
              color={color}
              size={size}
              isRolling={isRolling}
              isCrit={dice.isCrit}
              isFail={dice.isFail}
            />
          )}
        </motion.div>

        {/* Dice type badge */}
        <motion.div
          className="absolute px-2.5 py-1 rounded-full text-xs font-bold bg-gray-900/95 text-white border border-white/40 shadow-xl"
          style={{ top: -6, right: -6 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 400 }}
        >
          {diceType.toUpperCase()}
        </motion.div>

        {/* Adherence threshold badge */}
        {isAdherence && dice.threshold !== undefined && (
          <motion.div
            className="absolute px-2 py-1 rounded-full text-xs font-bold bg-purple-900/95 text-purple-200 border border-purple-400 shadow-xl"
            style={{ top: -6, left: -8 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 400 }}
          >
            ≤{dice.threshold}
          </motion.div>
        )}

        {/* Result labels */}
        <AnimatePresence>
          {showResult && (
            <>
              {/* Label below dice */}
              {dice.label && (
                <motion.div
                  className="absolute -bottom-11 left-1/2 whitespace-nowrap"
                  style={{ transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350 }}
                >
                  <span className={`text-sm font-bold px-4 py-1.5 rounded-full shadow-xl ${
                    passed ? 'bg-green-500 text-white' :
                    failed ? 'bg-red-500 text-white' :
                    dice.isCrit ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black' :
                    dice.isFail ? 'bg-red-600 text-white' :
                    'bg-gray-900/95 text-white border border-white/25'
                  }`}>
                    {dice.label}
                  </span>
                </motion.div>
              )}

              {/* OBEYS/REBELS for adherence checks */}
              {isAdherence && dice.threshold !== undefined && (
                <motion.div
                  className="absolute -top-14 left-1/2"
                  style={{ transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0, scale: 0.5, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 15 }}
                >
                  <motion.span
                    className={`text-2xl font-black ${passed ? 'text-green-400' : 'text-red-400'}`}
                    style={{
                      textShadow: `0 0 25px ${passed ? 'rgba(74,222,128,0.95)' : 'rgba(248,113,113,0.95)'}`,
                    }}
                    animate={{ scale: [1, 1.18, 1] }}
                    transition={{ duration: 0.35, repeat: 2 }}
                  >
                    {passed ? '✓ OBEYS!' : '✗ REBELS!'}
                  </motion.span>
                </motion.div>
              )}

              {/* CRITICAL for attack crits */}
              {dice.isCrit && !isAdherence && (
                <motion.div
                  className="absolute -top-14 left-1/2"
                  style={{ transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 12 }}
                >
                  <motion.span
                    className="text-2xl font-black text-amber-300"
                    style={{
                      textShadow: '0 0 30px rgba(252,211,77,1), 0 0 60px rgba(245,158,11,0.7)',
                    }}
                    animate={{ scale: [1, 1.2, 1], rotate: [0, -4, 4, 0] }}
                    transition={{ duration: 0.45, repeat: 2 }}
                  >
                    ⚔ CRITICAL! ⚔
                  </motion.span>
                </motion.div>
              )}

              {/* FUMBLE for attack fails */}
              {dice.isFail && dice.type === 'attack' && (
                <motion.div
                  className="absolute -top-14 left-1/2"
                  style={{ transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.span
                    className="text-xl font-black text-red-400"
                    style={{ textShadow: '0 0 25px rgba(248,113,113,0.9)' }}
                    animate={{ x: [-4, 4, -4, 4, 0] }}
                    transition={{ duration: 0.35, repeat: 2 }}
                  >
                    ✗ FUMBLE!
                  </motion.span>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const DiceRoll: React.FC<DiceRollProps> = ({ diceRolls }) => {
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-none">
      <AnimatePresence>
        {diceRolls.map((dice, index) => (
          <RollingDice
            key={dice.id}
            dice={dice}
            offsetX={index * 55}
            offsetY={index * -30}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default DiceRoll;
