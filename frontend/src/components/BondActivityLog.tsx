import React, { useEffect, useState } from 'react';
import { characterAPI } from '../services/apiClient';
import { BondActivityLog as BondActivityLogType } from '../types/api';
import { Clock, MessageCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface BondActivityLogProps {
    characterId: string;
    className?: string;
}

export default function BondActivityLog({ characterId, className = '' }: BondActivityLogProps) {
    const [logs, setLogs] = useState<BondActivityLogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchLogs = async () => {
            try {
                setLoading(true);
                const response = await characterAPI.get_bond_history(characterId);
                if (mounted) {
                    if (response.success) {
                        setLogs(response.history);
                    } else {
                        setError('Failed to load bond history');
                    }
                }
            } catch (err) {
                if (mounted) {
                    console.error('Error fetching bond logs:', err);
                    setError('Could not load history');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        if (characterId) {
            fetchLogs();
        }

        return () => {
            mounted = false;
        };
    }, [characterId]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getActivityIcon = (type: string) => {
        if (type.includes('chat') || type.includes('conversation')) return <MessageCircle className="w-4 h-4 text-blue-400" />;
        if (type.includes('battle') || type.includes('victory')) return <Activity className="w-4 h-4 text-red-400" />;
        if (type.includes('training') || type.includes('coaching')) return <TrendingUp className="w-4 h-4 text-green-400" />;
        return <Clock className="w-4 h-4 text-gray-400" />;
    };

    const formatActivityType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) {
        return (
            <div className={`flex justify-center p-4 ${className}`}>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`text-center text-red-400 text-sm p-4 ${className}`}>
                {error}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className={`text-center text-gray-500 text-sm p-4 italic ${className}`}>
                No relationship history yet.
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Relationship History</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {logs.map((log) => (
                    <div key={log.id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50 flex items-start gap-3">
                        <div className="mt-1">
                            {getActivityIcon(log.activity_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-gray-200 truncate">
                                    {formatActivityType(log.activity_type)}
                                </span>
                                <span className={`text-xs font-bold ${log.bond_change > 0 ? 'text-green-400' : log.bond_change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                    {log.bond_change > 0 ? '+' : ''}{log.bond_change}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex justify-between">
                                <span>{log.source}</span>
                                <span>{formatTime(log.created_at)}</span>
                            </div>
                            {/* Optional: Show context details if interesting */}
                            {log.context && log.context.message_length && (
                                <div className="text-xs text-gray-600 mt-1 italic truncate">
                                    Chat interaction
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
