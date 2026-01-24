import React from 'react';

interface PowerRebellionMeterProps {
  adherence: number;
  threshold?: number;
}

export default function PowerRebellionMeter({ adherence, threshold = 70 }: PowerRebellionMeterProps) {
  // Show when:
  // - Below threshold (< 70) - always show when in danger
  // - OR within 10 points above threshold (70-80) - warning zone
  const shouldShow = adherence < threshold || (adherence >= threshold && adherence <= threshold + 10);

  if (!shouldShow) {
    return null;
  }

  const percentage = Math.min(100, Math.max(0, adherence));
  const barColor = adherence >= threshold
    ? 'bg-yellow-500' // Warning - getting close
    : 'bg-red-500';   // Danger - rebellion imminent

  const statusIcon = adherence >= threshold ? '⚠️' : '🔥';
  const statusText = adherence >= threshold
    ? 'Getting restless'
    : 'Rebellion imminent!';

  return (
    <div className={`
      mb-6 rounded-lg border-2 p-4
      ${adherence >= threshold
        ? 'border-yellow-500/50 bg-yellow-500/10'
        : 'border-red-500/50 bg-red-500/10'}
    `}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>⚖️</span>
          <span>COACH CONTROL METER</span>
        </h3>
        <span className={`
          text-sm font-semibold px-3 py-1 rounded
          ${adherence >= threshold
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-red-500/20 text-red-400'}
        `}>
          {statusIcon} {statusText}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Adherence: {adherence}/{threshold}</span>
          <span>{percentage}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`${barColor} h-full transition-all duration-500 relative`}
            style={{ width: `${percentage}%` }}
          >
            {adherence < threshold && (
              <div className="absolute inset-0 animate-pulse bg-white/20"></div>
            )}
          </div>
        </div>

        {/* Threshold marker */}
        <div className="relative h-2 -mt-1">
          <div
            className="absolute top-0 w-0.5 h-2 bg-white"
            style={{ left: `${threshold}%` }}
          >
            <div className="absolute -top-1 -left-2 text-xs text-white">
              ↓{threshold}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="text-sm text-gray-400 space-y-1">
        {adherence >= threshold ? (
          <>
            <p>⚠️ <strong className="text-yellow-400">Warning:</strong> Adherence is close to rebellion threshold</p>
            <p className="text-xs">Character may spend power points independently when adherence drops below {threshold}</p>
          </>
        ) : (
          <>
            <p>🔥 <strong className="text-red-400">Danger:</strong> Character is likely to rebel!</p>
            <p className="text-xs">Character will make own power choices until adherence rises above {threshold}</p>
          </>
        )}
      </div>
    </div>
  );
}
