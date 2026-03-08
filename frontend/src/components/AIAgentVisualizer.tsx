import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Brain, Volume2, Loader2, Sparkles, Star, History } from 'lucide-react';
import { cn } from '../utils/cn';

export type AIState = 'idle' | 'continuous' | 'listening' | 'processing' | 'speaking';

interface AIAgentVisualizerProps {
    state: AIState;
    onClick: () => void;
    onLogVitals?: () => void;
    label?: string;
    isMuted?: boolean;
    onToggleMute?: () => void;
    floating?: boolean;
    onViewHistory?: () => void;
    t?: (key: string) => string;
    isAudioBlocked?: boolean;
    className?: string;
}

export const AIAgentVisualizer: React.FC<AIAgentVisualizerProps> = ({ state, onClick, onLogVitals, label, isMuted, onToggleMute, floating, onViewHistory, t, isAudioBlocked, className }) => {
    // Utility for local translation or fallback
    const translate = (key: string, fallback: string) => {
        if (t) return t(key);
        return fallback;
    };

    const isListening = state === 'listening' && !isMuted;
    const isProcessing = state === 'processing';
    const isSpeaking = state === 'speaking';
    const isContinuous = state === 'continuous';

    if (floating) {
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn("fixed bottom-40 right-6 z-[60] flex flex-col items-end gap-3", className)}
            >
                <AnimatePresence>
                    {(label || isProcessing || isSpeaking || isListening) && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.8 }}
                            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 max-w-[240px]"
                        >
                            <p className="text-[10px] font-black uppercase tracking-widest text-sapphire-500 mb-1">
                                {isListening ? translate('listening', "Listening...") : isProcessing ? translate('thinking', "Thinking...") : isSpeaking ? translate('speaking', "Speaking...") : "Guardian Info"}
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-3">
                                {isAudioBlocked ? "Tap here to enable sound" : (label || (isListening ? translate('listening_desc', "I'm listening...") : isProcessing ? translate('thinking', "Thinking...") : translate('ready_to_help', "Ready to help!")))}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative">
                    {/* Animated Pulsing Rings for Bubble */}
                    {(isListening || isSpeaking) && (
                        <motion.div
                            animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className={cn("absolute inset-0 rounded-full blur-sm", isListening ? "bg-red-500" : "bg-emerald-500")}
                        />
                    )}

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClick}
                        className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 relative z-10",
                            isAudioBlocked ? "bg-amber-500 animate-bounce" :
                                isListening ? "bg-red-500" :
                                    isProcessing ? "bg-slate-900" :
                                        isSpeaking ? "bg-emerald-500" :
                                            "bg-gradient-to-br from-sapphire-500 to-blue-600"
                        )}
                    >
                        {isAudioBlocked ? <Volume2 className="w-8 h-8" /> :
                            isListening ? <Mic className="w-8 h-8" /> :
                                isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> :
                                    isSpeaking ? <Volume2 className="w-8 h-8" /> :
                                        <Brain className="w-8 h-8" />}
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className={cn("flex flex-col items-center justify-center py-12 relative", className)}>
            <div className="relative group">
                {/* Background Glows */}
                <AnimatePresence>
                    {(isListening || isSpeaking) && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0.15 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className={cn(
                                "absolute inset-0 rounded-full blur-3xl",
                                isListening ? "bg-red-500" : "bg-sapphire-500"
                            )}
                        />
                    )}
                </AnimatePresence>

                {/* Animated Rings for Listening */}
                {isListening && (
                    <>
                        <motion.div
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-0 rounded-full border-4 border-red-500/30"
                        />
                        <motion.div
                            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                            className="absolute inset-0 rounded-full border-2 border-red-400/20"
                        />
                    </>
                )}

                {/* Main Orb */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClick}
                    className={cn(
                        "relative z-10 w-48 h-48 rounded-full flex items-center justify-center text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] cursor-pointer transition-all duration-700 overflow-hidden",
                        isListening ? "bg-red-500 shadow-red-200" :
                            isProcessing ? "bg-slate-900 shadow-slate-200" :
                                isSpeaking ? "bg-emerald-500 shadow-emerald-200" :
                                    isContinuous ? "bg-sapphire-600 shadow-sapphire-200" :
                                        "bg-sapphire-500 shadow-sapphire-200"
                    )}
                >
                    {/* Breathing Animation for Continuous Mode */}
                    {isContinuous && !isListening && (
                        <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute inset-0 bg-white/10"
                        />
                    )}

                    {/* Content based on state */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={state}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            {isListening && <Mic className="w-24 h-24 animate-pulse" />}
                            {isProcessing && <Loader2 className="w-24 h-24 animate-spin" />}
                            {isSpeaking && <Volume2 className="w-24 h-24" />}
                            {isContinuous && !isListening && !isProcessing && !isSpeaking && (
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative"
                                >
                                    <Brain className="w-24 h-24" />
                                    <motion.div
                                        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -top-2 -right-2"
                                    >
                                        <Sparkles className="w-8 h-8 text-yellow-300" />
                                    </motion.div>
                                </motion.div>
                            )}
                            {state === 'idle' && <Brain className="w-24 h-24 opacity-50" />}
                        </motion.div>
                    </AnimatePresence>

                    {/* Sound Waves for Speaking */}
                    {isSpeaking && (
                        <div className="absolute bottom-10 flex gap-1 items-end h-8">
                            {[0.4, 0.8, 0.6, 1, 0.7, 0.9, 0.5].map((h, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [`${h * 20}%`, `${h * 100}%`, `${h * 20}%`] }}
                                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                    className="w-1.5 bg-white rounded-full"
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Labels */}
            <div className="mt-10 text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={state}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                    >
                        <span className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm transition-colors",
                            isListening ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" :
                                isProcessing ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300" :
                                    isSpeaking ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" :
                                        isContinuous ? "bg-sapphire-100 dark:bg-sapphire-900/40 text-sapphire-700 dark:text-sapphire-400" :
                                            "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}>
                            {isListening ? translate('listening', "Listening...") :
                                isProcessing ? translate('thinking', "Thinking...") :
                                    isSpeaking ? translate('speaking', "Speaking...") :
                                        isContinuous ? translate('ready', "Guardian Ready") : translate('manual_mode', "Manual Mode")}
                        </span>

                        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm mt-4">
                            {isAudioBlocked ? "Browser blocked audio. Please tap the orb to enable Guardian's voice." : (label || (
                                isListening ? translate('listening_desc', "I'm listening, go ahead...") :
                                    isProcessing ? translate('thinking', "Thinking...") :
                                        isSpeaking ? translate('speaking', "Here's what I found...") :
                                            translate('ready_to_help', "Your Guardian is ready. Say 'Hey Guardian' to talk.")
                            ))}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4 mt-6">
                {onLogVitals && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLogVitals}
                        className="px-6 py-3 bg-red-100/80 dark:bg-red-500/10 hover:bg-red-200/80 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-2 border-2 border-red-500/30 dark:border-red-500/20 shadow-sm transition-all group"
                    >
                        <div className="w-6 h-6 bg-red-600 dark:bg-red-500 rounded-lg flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                            <Star className="w-3.5 h-3.5 fill-white" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Log Vitals</span>
                    </motion.button>
                )}

                {onToggleMute && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleMute();
                        }}
                        className={cn(
                            "px-4 py-3 rounded-2xl flex items-center gap-2 border-2 shadow-sm transition-all group",
                            isMuted
                                ? "bg-slate-200/80 dark:bg-slate-800/80 text-slate-500 border-slate-300 dark:border-slate-700"
                                : "bg-blue-100/80 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20"
                        )}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                        {isMuted ? <MicOff className="w-5 h-5 opacity-70" /> : <Mic className="w-5 h-5" />}
                    </motion.button>
                )}

                {onViewHistory && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewHistory();
                        }}
                        className="px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl flex items-center gap-2 border-2 border-slate-200 dark:border-slate-700 shadow-sm transition-all group"
                        title="View Chat History"
                    >
                        <History className="w-5 h-5 text-sapphire-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">History</span>
                    </motion.button>
                )}
            </div>
        </div>
    );
};
