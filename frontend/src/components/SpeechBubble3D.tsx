'use client';

import React from 'react';
import { Html } from '@react-three/drei';

interface SpeechBubble3DProps {
  text: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  bubbleRotate?: number; // Visual rotation for comic book effect
  bubbleScale?: number;
  borderRadius?: string;
  isFirstInChain?: boolean;
  layoutType?: string; // For tail positioning (arc vs straight)
  index?: number; // Z-index for layering
}

/**
 * Comic book style speech bubble positioned in 3D space
 * Renders as 2D HTML overlay at the 3D position
 */
export function SpeechBubble3D({
  text,
  position,
  rotation = [0, 0, 0],
  bubbleRotate = 0,
  bubbleScale = 1,
  borderRadius = '20px 22px 18px 24px',
  isFirstInChain = true,
  layoutType = 'stack',
  index = 0
}: SpeechBubble3DProps) {
  const isArc = layoutType.includes('arc');

  return (
    <Html
      position={position}
      rotation={rotation}
      center
      transform
      sprite
      occlude
      distanceFactor={3}
      zIndexRange={[100 + index, 0]}
    >
      <div
        style={{
          position: 'relative',
          transform: `rotate(${bubbleRotate * 0.3}deg) scale(${bubbleScale})`,
          minWidth: '90px',
          maxWidth: '130px',
          backgroundColor: 'white',
          padding: '10px 14px',
          borderRadius: borderRadius,
          border: '2px solid #222',
          boxShadow: '3px 3px 0px #222',
          fontFamily: '"Comic Sans MS", "Bangers", cursive, sans-serif',
          fontSize: '13px',
          fontWeight: 'bold',
          lineHeight: 1.3,
          textAlign: 'center',
          animation: 'bubblePopIn 0.3s ease-out forwards',
          pointerEvents: 'none',
        }}
      >
        {/* Speech tail - only on first bubble */}
        {isFirstInChain && (
          <div
            style={{
              position: 'absolute',
              bottom: '-18px',
              left: isArc ? '70%' : '25px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '14px solid transparent',
              borderTop: '22px solid white',
              filter: 'drop-shadow(2px 2px 0px #222)',
              transform: `rotate(${isArc ? -45 : -15}deg)`,
            }}
          />
        )}
        {text}
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes bubblePopIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </Html>
  );
}
