import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SurveyOption {
    id: string;
    name: string;
    description: string;
    rationale: string;
    icon?: string;
}

interface RebellionSurveyProps {
    characterName: string;
    coachChoiceName: string;
    options: SurveyOption[];
    onSelect: (optionId: string) => void;
}

export default function RebellionSurvey({
    characterName,
    coachChoiceName,
    options,
    onSelect
}: RebellionSurveyProps) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gray-900 border-2 border-red-500 rounded-xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4 animate-pulse">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {characterName} is Rebelling!
                    </h2>
                    <p className="text-gray-300">
                        They refuse to unlock <span className="text-blue-400 font-semibold">{coachChoiceName}</span>.
                        <br />
                        <span className="italic text-red-300">"I know what I need better than you do, Coach. Pick one of these instead."</span>
                    </p>
                </div>

                <div className="space-y-3">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => onSelect(option.id)}
                            className="w-full text-left p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-red-500 hover:bg-gray-800/80 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-900/0 via-red-900/0 to-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex justify-between items-start relative z-10">
                                <div className="pr-4">
                                    <div className="font-bold text-white text-lg group-hover:text-red-400 transition-colors flex items-center gap-2">
                                        {option.icon && <span>{option.icon}</span>}
                                        {option.name}
                                    </div>
                                    <div className="text-sm text-gray-400 mb-2 mt-1">{option.description}</div>
                                    <div className="text-sm text-red-300 italic border-l-2 border-red-500/30 pl-3 py-1 bg-red-900/10 rounded-r">
                                        "{option.rationale}"
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                                    <CheckCircle2 className="w-6 h-6 text-red-500" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-6 text-center text-xs text-gray-500">
                    Selecting an option will consume the unlock point but lower adherence further.
                </div>
            </motion.div>
        </div>
    );
}
