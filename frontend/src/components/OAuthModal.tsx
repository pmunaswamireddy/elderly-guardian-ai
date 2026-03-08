import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Shield } from 'lucide-react';

interface OAuthModalProps {
    provider: {
        id: string;
        name: string;
        color: string;
        bgColor: string;
        icon: React.ReactNode;
        email: string;       // simulated OAuth email
        displayName: string; // simulated OAuth name
        avatar?: string;     // simulated avatar URL
    };
    onClose: () => void;
    onSuccess: (data: { provider: string; email: string; name: string; avatar?: string }) => void;
}

const STEPS = [
    { label: 'Connecting', desc: 'Establishing secure connection...' },
    { label: 'Authorizing', desc: 'Verifying your identity...' },
    { label: 'Fetching Profile', desc: 'Loading your profile data...' },
    { label: 'Complete', desc: 'Authentication successful!' },
];

export default function OAuthModal({ provider, onClose, onSuccess }: OAuthModalProps) {
    const [step, setStep] = useState(0);
    const [error] = useState<string | null>(null);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        // Simulate multi-step OAuth
        timers.push(setTimeout(() => setStep(1), 1200));
        timers.push(setTimeout(() => setStep(2), 2400));
        timers.push(setTimeout(() => setStep(3), 3600));
        timers.push(setTimeout(() => {
            onSuccess({
                provider: provider.id,
                email: provider.email,
                name: provider.displayName,
                avatar: provider.avatar,
            });
        }, 4200));
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                    style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: provider.bgColor }}
                            >
                                {provider.icon}
                            </div>
                            <div>
                                <p className="text-white font-black text-base">Sign in with {provider.name}</p>
                                <p className="text-slate-500 text-xs">Secure OAuth 2.0 Authentication</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="px-6 py-4 space-y-3">
                        {STEPS.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: step >= i ? 1 : 0.3, x: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.3 }}
                                className="flex items-center gap-3"
                            >
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                                        step > i ? 'bg-emerald-500 text-white' :
                                        step === i ? `text-white` : 'bg-slate-800 text-slate-500'
                                    }`}
                                    style={step === i ? { background: provider.color } : undefined}
                                >
                                    {step > i ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : step === i ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        i + 1
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${step >= i ? 'text-white' : 'text-slate-600'}`}>{s.label}</p>
                                    <p className={`text-xs ${step >= i ? 'text-slate-400' : 'text-slate-700'}`}>{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Simulated Account Preview */}
                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-6 pb-4"
                            >
                                <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3">Account Preview</p>
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg"
                                            style={{ background: provider.color }}
                                        >
                                            {provider.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-bold">{provider.displayName}</p>
                                            <p className="text-slate-400 text-xs">{provider.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error */}
                    {error && (
                        <div className="px-6 pb-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-bold text-center">
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-6 pb-6 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] text-slate-600 font-bold">256-bit SSL Encrypted</span>
                        </div>
                        {step === 3 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 text-emerald-400"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-xs font-black">Verified</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-slate-900">
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${provider.color}, #10b981)` }}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
