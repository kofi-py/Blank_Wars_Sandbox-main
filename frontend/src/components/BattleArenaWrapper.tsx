'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { HexBattleArena } from './battle/HexBattleArena';
import { type Team } from '@/data/teamBattleSystem';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 bg-red-900/20 border border-red-500 rounded-lg">
      <h2 className="text-xl font-bold text-red-400 mb-4">Battle Arena Error</h2>
      <p className="text-red-300 mb-4">{error.message}</p>
      <pre className="text-sm text-red-200 bg-red-900/30 p-4 rounded overflow-auto mb-4">
        {error.stack}
      </pre>
      <button 
        onClick={resetErrorBoundary}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
      >
        Try Again
      </button>
    </div>
  );
}

interface BattleArenaWrapperProps {
  user_team: Team;
  opponent_team: Team;
  onBattleEnd?: (result: { winner: 'user' | 'opponent'; user_health: number; opponent_health: number }) => void;
}

export default function BattleArenaWrapper(props: BattleArenaWrapperProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <HexBattleArena {...props} />
    </ErrorBoundary>
  );
}
