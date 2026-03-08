import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Shield, Activity, Pill, Heart, Zap, Sparkles, Brain,
    Mic, MapPin, Bell, MessageSquare, Loader2, RefreshCw,
    Sun, CheckCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FEATURES = [
    { icon: Heart,         text: 'Real-time Vital Monitoring',         color: 'text-red-500',     desc: 'Live BP, sugar, oxygen tracking with alerts' },
    { icon: Pill,          text: 'Smart Medicine Reminders',            color: 'text-blue-500',    desc: 'AI-timed dose alerts with adherence tracking' },
    { icon: Activity,      text: 'Predictive Health Analysis',          color: 'text-emerald-500', desc: 'Gemini AI health reports from vitals history' },
    { icon: Mic,           text: 'Multilingual Voice Assistant',        color: 'text-purple-500',  desc: '12+ Indian languages, hands-free commands' },
    { icon: Brain,         text: 'AI Appointment Booking',              color: 'text-amber-500',   desc: 'Auto-fills forms from natural language' },
    { icon: MapPin,        text: 'Live Location Tracking',              color: 'text-rose-500',    desc: 'Guardian map for caregivers & family' },
    { icon: Bell,          text: 'Emergency SOS',                       color: 'text-orange-500',  desc: 'One-hold call to emergency contacts' },
    { icon: MessageSquare, text: 'Caregiver Community Chat',            color: 'text-cyan-500',    desc: 'Channels, DMs, moderation & roles' },
];

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    const [aiInfo, setAiInfo] = useState<{ tip: string; feature: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshed, setRefreshed] = useState(false);

    const fetchAiInfo = async (forceRefresh = false) => {
        setLoading(true);
        try {
            const url = forceRefresh
                ? `${API_BASE_URL}/api/app-info?bust=${Date.now()}`
                : `${API_BASE_URL}/api/app-info`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setAiInfo(data);
                if (forceRefresh) { setRefreshed(true); setTimeout(() => setRefreshed(false), 2000); }
            }
        } catch {
            /* silent — fallback shown below */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchAiInfo();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl"
                />

                {/* Panel */}
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 24 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 24 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 dark:border-slate-800"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header gradient */}
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-blue-600/20 via-emerald-500/10 to-purple-600/10 pointer-events-none" />

                    <div className="p-8 md:p-10 relative z-10 space-y-7">

                        {/* Title Row */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl ring-4 ring-white dark:ring-slate-800 shrink-0">
                                    <Shield className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Guardian AI</h2>
                                    <p className="text-blue-500 font-bold uppercase tracking-widest text-[10px] mt-0.5">v2.1.0 · Advanced Care · 2025</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors group">
                                <X className="w-5 h-5 text-slate-400 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        {/* Feature Grid */}
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Zap className="w-3.5 h-3.5 text-amber-500" /> Live Features
                            </h3>
                            <div className="grid grid-cols-2 gap-2.5">
                                {FEATURES.map((f, i) => (
                                    <motion.div
                                        key={f.text}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <f.icon className={`w-4 h-4 mt-0.5 shrink-0 ${f.color}`} />
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{f.text}</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{f.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* AI Daily Tip */}
                        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 relative">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sun className="w-3.5 h-3.5 text-amber-400" /> AI Daily Health Tip
                                </h3>
                                <button
                                    onClick={() => fetchAiInfo(true)}
                                    disabled={loading}
                                    title="Refresh AI tip"
                                    className="p-1.5 rounded-lg hover:bg-white/50 transition-colors disabled:opacity-40"
                                >
                                    {refreshed
                                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        : loading
                                            ? <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                            : <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                    }
                                </button>
                            </div>

                            {loading && !aiInfo ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="font-medium">Asking AI…</span>
                                </div>
                            ) : aiInfo?.tip ? (
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {aiInfo.tip}
                                </p>
                            ) : (
                                <p className="text-sm font-bold text-slate-500 italic">Tip unavailable — check backend connection.</p>
                            )}

                            {aiInfo?.feature && (
                                <div className="mt-3 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                                        Spotlight: {aiInfo.feature}
                                    </span>
                                </div>
                            )}

                            <p className="text-[9px] text-slate-400 mt-2 font-medium">Generated by Llama 3.1 · updates daily</p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex gap-2 flex-wrap">
                                <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-500">Security Verified</span>
                                <span className="px-2.5 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-[9px] font-black uppercase text-emerald-600">HIPAA Compliant</span>
                                <span className="px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-[9px] font-black uppercase text-blue-600">AI Powered</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-7 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl text-sm"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
