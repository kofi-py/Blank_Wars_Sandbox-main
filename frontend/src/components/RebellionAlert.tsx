import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';

interface RebellionAlertProps {
    isOpen: boolean;
    onClose: () => void;
    characterName: string;
    coachChoiceName: string;
    rebellionChoiceName: string;
    rebellionChoiceType: 'power' | 'spell';
    lockoutUntil: string; // ISO timestamp
    reasoning: string;
}

export default function RebellionAlert({
    isOpen,
    onClose,
    characterName,
    coachChoiceName,
    rebellionChoiceName,
    rebellionChoiceType,
    lockoutUntil,
    reasoning
}: RebellionAlertProps) {
    if (!isOpen) return null;

    const lockoutDate = new Date(lockoutUntil);
    const lockoutTime = lockoutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-red-950/90 border-2 border-red-500 rounded-xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(220,38,38,0.5)] relative overflow-hidden"
                >
                    {/* Background Pulse Effect */}
                    <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />

                    <div className="text-center mb-6 relative z-10">
                        <div className="mx-auto bg-red-900/50 w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 border-red-500">
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                        </div>

                        <h2 className="text-3xl font-black text-red-500 mb-2 uppercase tracking-wider">
                            Rebellion!
                        </h2>

                        <p className="text-xl text-white font-bold mb-1">
                            {characterName} refused your orders.
                        </p>
                    </div>

                    <div className="bg-black/40 rounded-lg p-4 mb-6 border border-red-500/30 relative z-10">
                        <div className="flex justify-between items-center mb-2 text-sm text-gray-400">
                            <span>You wanted:</span>
                            <span className="line-through text-gray-500">{coachChoiceName}</span>
                        </div>

                        <div className="flex justify-between items-center mb-4 text-lg text-white font-bold">
                            <span>They chose:</span>
                            <span className="text-red-400 flex items-center gap-2">
                                {rebellionChoiceName}
                                <span className="text-xs bg-red-900/50 px-2 py-0.5 rounded border border-red-500/30 uppercase">
                                    {rebellionChoiceType}
                                </span>
                            </span>
                        </div>

                        <div className="text-red-200 italic text-sm border-l-2 border-red-500 pl-3 py-1">
                            "{reasoning}"
                        </div>
                    </div>

                    <div className="bg-red-900/20 rounded-lg p-4 mb-6 border border-red-500/50 flex items-center gap-4 relative z-10">
                        <div className="bg-red-900/50 p-2 rounded-full">
                            <Lock className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <div className="text-red-400 font-bold uppercase text-sm tracking-wide">Coach Lockout Active</div>
                            <div className="text-white text-xs">
                                You cannot make further decisions for this character until <span className="font-mono font-bold text-red-300">{lockoutTime}</span>.
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors uppercase tracking-widest shadow-lg relative z-10"
                    >
                        Accept Consequences
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
