import React from 'react';
import { WordBubble as WordBubbleType } from '@/types/wordBubble';

interface WordBubbleProps {
  bubble: WordBubbleType;
  onDismiss: (bubbleId: string) => void;
  onTap: (bubbleId: string) => void;
  container_width: number;
  container_height: number;
}

export default function WordBubble({ bubble }: WordBubbleProps) {
  return (
    <div
      className="absolute z-50"
      style={{
        left: `${bubble.position.x}%`,
        top: `${bubble.position.y}%`,
        transform: 'translate(-50%, 0%)'
      }}
    >
      {/* Simple speech bubble - VERY LARGE for comic book style readability */}
      <div className="bg-white border-8 border-gray-800 rounded-3xl px-24 py-16 shadow-2xl min-w-[1000px] max-w-[1800px]">
        {/* Character name */}
        <div className="font-bold text-gray-800 mb-6" style={{ fontSize: '80px' }}>
          {bubble.character_name}
        </div>
        {/* Message */}
        <p className="text-gray-900 leading-tight font-bold" style={{ fontSize: '100px', lineHeight: '1.2' }}>
          {bubble.message}
        </p>
        {/* Simple tail pointing down */}
        <div className="absolute top-full left-12 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[20px] border-l-transparent border-r-transparent border-t-white"></div>
      </div>
    </div>
  );
}