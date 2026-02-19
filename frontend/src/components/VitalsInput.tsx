import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Droplet, Activity, Save, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface VitalsInputProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    onVitalsUpdated: () => void;
    lastRecordedVitals?: any;
    initialData?: any;
}

const VitalsInput: React.FC<VitalsInputProps> = ({ isOpen, onClose, userId, onVitalsUpdated, lastRecordedVitals, initialData }) => {
    const [form, setForm] = useState(initialData || {
        bp_systolic: 120,
        bp_diastolic: 80,
        sugar_level: 100,
        heart_rate: 72,
        notes: ''
    });

    React.useEffect(() => {
        if (initialData) {
            setForm(initialData);
        }
    }, [initialData]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const isEdit = !!initialData?.id;
            const url = isEdit ? `${API_BASE_URL}/api/vitals/${initialData.id}` : `${API_BASE_URL}/api/vitals`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    bp_systolic: form.bp_systolic,
                    bp_diastolic: form.bp_diastolic,
                    sugar_level: form.sugar_level,
                    heart_rate: form.heart_rate,
                    notes: form.notes
                })
            });

            if (!response.ok) throw new Error("Failed to save vitals");

            setSuccess(true);
            onVitalsUpdated();

            setTimeout(() => {
                onClose();
                setSuccess(false);
                setForm({
                    bp_systolic: 120,
                    bp_diastolic: 80,
                    sugar_level: 100,
                    heart_rate: 72,
                    notes: ''
                });
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Log Vitals</h2>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12 flex flex-col items-center justify-center text-center"
                            >
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                                    <Save className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Vitals Recorded!</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-bold">Your health data has been successfully updated.</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-6">
                                {lastRecordedVitals && (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-8 flex justify-between gap-4">
                                        <div className="text-center flex-1 border-r border-slate-200 dark:border-slate-700">
                                            <span className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Last Recorded</span>
                                            <div className="text-xl font-black text-slate-800 dark:text-slate-200">
                                                {lastRecordedVitals.bp?.systolic ?? '--'}/{lastRecordedVitals.bp?.diastolic ?? '--'}
                                                <span className="text-xs text-slate-400 font-medium ml-1">/ 120/80</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold">BP</span>
                                        </div>
                                        <div className="text-center flex-1 border-r border-slate-200 dark:border-slate-700">
                                            <span className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Sugar</span>
                                            <div className="text-xl font-black text-slate-800 dark:text-slate-200">
                                                {lastRecordedVitals.sugar?.level ?? '--'}
                                                <span className="text-xs text-slate-400 font-medium ml-1">/ 100</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold">mg/dL</span>
                                        </div>
                                        <div className="text-center flex-1">
                                            <span className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Heart</span>
                                            <div className="text-xl font-black text-slate-800 dark:text-slate-200">
                                                {lastRecordedVitals.heart_rate?.bpm ?? '--'}
                                                <span className="text-xs text-slate-400 font-medium ml-1">/ 72</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold">BPM</span>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase">Systolic BP</label>
                                            <div className="relative">
                                                <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                                <input
                                                    type="number"
                                                    value={form.bp_systolic}
                                                    onChange={(e) => setForm({ ...form, bp_systolic: parseInt(e.target.value) || 0 })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:!bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-sapphire-500 outline-none font-bold text-slate-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase">Diastolic BP</label>
                                            <input
                                                type="number"
                                                value={form.bp_diastolic}
                                                onChange={(e) => setForm({ ...form, bp_diastolic: parseInt(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 bg-slate-50 dark:!bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-sapphire-500 outline-none font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Sugar Level (mg/dL)</label>
                                        <div className="relative">
                                            <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                            <input
                                                type="number"
                                                value={form.sugar_level}
                                                onChange={(e) => setForm({ ...form, sugar_level: parseInt(e.target.value) || 0 })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:!bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-sapphire-500 outline-none font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Heart Rate (bpm)</label>
                                        <div className="relative">
                                            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                            <input
                                                type="number"
                                                value={form.heart_rate}
                                                onChange={(e) => setForm({ ...form, heart_rate: parseInt(e.target.value) || 0 })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:!bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-sapphire-500 outline-none font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Notes (Optional)</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:!bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-sapphire-500 outline-none font-medium text-sm h-24 resize-none text-slate-900 dark:text-white"
                                            placeholder="Add any symptoms or observations..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-to-r from-sapphire-600 to-emerald-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-sapphire-500/30 hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-5 h-5" />
                                        {loading ? 'Saving...' : 'Save Vitals'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default VitalsInput;
