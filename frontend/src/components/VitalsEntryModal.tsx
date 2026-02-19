import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Droplet, Activity, Save, CheckCircle, Brain } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface VitalsEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    onSuccess: () => void;
}

const VitalsEntryModal: React.FC<VitalsEntryModalProps> = ({ isOpen, onClose, userId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [vitals, setVitals] = useState({
        bp_systolic: 120,
        bp_diastolic: 80,
        sugar_level: 100,
        heart_rate: 72,
        notes: ''
    });
    const [analysis, setAnalysis] = useState<any>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/vitals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...vitals, user_id: userId })
            });
            const data = await response.json();
            if (data.success) {
                setAnalysis(data.analysis);
                setSuccess(true);
                onSuccess();
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                }, 5000);
            }
        } catch (error) {
            console.error("Failed to save vitals:", error);
            alert("Failed to save. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative"
                >
                    {!success ? (
                        <>
                            <div className="p-8 pb-0 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-red-500/10 rounded-2xl">
                                        <Activity className="w-6 h-6 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">Update Vitals</h2>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Heart className="w-3 h-3 text-red-500" /> Systolic BP
                                        </label>
                                        <input
                                            type="number"
                                            value={vitals.bp_systolic}
                                            onChange={(e) => setVitals({ ...vitals, bp_systolic: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-xl !text-black dark:!text-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Heart className="w-3 h-3 text-red-400" /> Diastolic BP
                                        </label>
                                        <input
                                            type="number"
                                            value={vitals.bp_diastolic}
                                            onChange={(e) => setVitals({ ...vitals, bp_diastolic: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-xl !text-black dark:!text-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Droplet className="w-3 h-3 text-amber-500" /> Sugar Level
                                        </label>
                                        <input
                                            type="number"
                                            value={vitals.sugar_level}
                                            onChange={(e) => setVitals({ ...vitals, sugar_level: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-xl !text-black dark:!text-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="w-3 h-3 text-emerald-500" /> Heart Rate
                                        </label>
                                        <input
                                            type="number"
                                            value={vitals.heart_rate}
                                            onChange={(e) => setVitals({ ...vitals, heart_rate: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-xl !text-black dark:!text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Additional Notes</label>
                                    <textarea
                                        value={vitals.notes}
                                        onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
                                        placeholder="How are you feeling?"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-medium !text-black dark:!text-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all min-h-[100px]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-slate-900/20"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Save Vitals
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="p-12 text-center space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-500/30"
                            >
                                <CheckCircle className="w-10 h-10" />
                            </motion.div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Saved Successfully!</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">Your health records are updated.</p>
                            </div>

                            {analysis && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 text-left space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">AI Assessment</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">BP</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-white">{analysis.bp_status}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Sugar</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-white">{analysis.sugar_status}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Heart</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-white">{analysis.heart_status}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button onClick={onClose} className="text-slate-400 font-bold uppercase text-xs tracking-widest">Dismiss</button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default VitalsEntryModal;
