import React from 'react';
import { Heart, Shield, Zap, Star, Crown } from 'lucide-react';

interface BondLevelDisplayProps {
    bondLevel: number;
    compact?: boolean;
}

export default function BondLevelDisplay({ bondLevel, compact = false }: BondLevelDisplayProps) {
    // Determine trust level and config based on bond level
    const getTrustConfig = (level: number) => {
        if (level >= 91) return {
            label: 'Devoted',
            color: 'text-pink-400',
            bg: 'bg-pink-500',
            border: 'border-pink-500',
            icon: Crown,
            description: 'Will follow you into any danger without hesitation.'
        };
        if (level >= 76) return {
            label: 'Loyal',
            color: 'text-purple-400',
            bg: 'bg-purple-500',
            border: 'border-purple-500',
            icon: Star,
            description: 'Highly committed to your cause and leadership.'
        };
        if (level >= 51) return {
            label: 'Trusting',
            color: 'text-blue-400',
            bg: 'bg-blue-500',
            border: 'border-blue-500',
            icon: Shield,
            description: 'Believes in your guidance and decisions.'
        };
        if (level >= 21) return {
            label: 'Neutral',
            color: 'text-gray-400',
            bg: 'bg-gray-500',
            border: 'border-gray-500',
            icon: Zap,
            description: 'Neither trusts nor distrusts you yet.'
        };
        return {
            label: 'Low Trust',
            color: 'text-red-400',
            bg: 'bg-red-500',
            border: 'border-red-500',
            icon: Heart, // Broken heart concept
            description: 'Skeptical of your leadership capabilities.'
        };
    };

    const config = getTrustConfig(bondLevel);
    const Icon = config.icon;

    if (compact) {
        return (
            <div className="flex items-center gap-2" title={`${config.label}: ${config.description}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
                <div className="flex flex-col">
                    <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                    <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${config.bg} transition-all duration-500`}
                            style={{ width: `${bondLevel}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-gray-900 ${config.border} border`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                        <div className="text-sm text-gray-400">Bond Level</div>
                        <div className={`font-bold text-lg ${config.color}`}>{config.label}</div>
                    </div>
                </div>
                <div className="text-2xl font-bold text-white">{bondLevel}<span className="text-sm text-gray-500">/100</span></div>
            </div>

            <div className="relative h-4 bg-gray-900 rounded-full overflow-hidden mb-2 border border-gray-700">
                <div
                    className={`absolute top-0 left-0 h-full ${config.bg} transition-all duration-1000 ease-out`}
                    style={{ width: `${bondLevel}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>

                {/* Milestones markers */}
                <div className="absolute top-0 bottom-0 left-[20%] w-0.5 bg-gray-800/50 z-10"></div>
                <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-gray-800/50 z-10"></div>
                <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-gray-800/50 z-10"></div>
                <div className="absolute top-0 bottom-0 left-[90%] w-0.5 bg-gray-800/50 z-10"></div>
            </div>

            <p className="text-xs text-gray-400 italic text-center">
                "{config.description}"
            </p>
        </div>
    );
}
