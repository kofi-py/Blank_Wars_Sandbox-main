'use client';

import React from 'react';

/**
 * Blank Beast Ball Game Wrapper
 * Embeds the Blank Beast Ball game as an iframe
 */
const BlankBeastBallWrapper: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="p-6 border-b border-amber-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
          🦁 Blank Beast Ball 🎾
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Beast characters navigate through beast obstacles in ball form!
        </p>
      </div>

      {/* Game iframe */}
      <div className="flex-1 relative">
        <iframe
          src="/blank-beast-ball/index.html"
          className="w-full h-full border-0"
          title="Blank Beast Ball Game"
          allow="accelerometer; gyroscope"
        />
      </div>

      {/* Footer with instructions */}
      <div className="p-4 bg-amber-100 dark:bg-gray-800 border-t border-amber-200 dark:border-gray-700">
        <div className="flex gap-8 justify-center text-sm text-gray-700 dark:text-gray-300">
          <span><strong>WASD</strong> - Move</span>
          <span><strong>Q/E</strong> - Rotate</span>
          <span><strong>SPACE</strong> - Jump</span>
          <span><strong>Mouse</strong> - Look around</span>
        </div>
      </div>
    </div>
  );
};

export default BlankBeastBallWrapper;
