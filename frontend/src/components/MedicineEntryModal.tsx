import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pill, Check, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface MedicineEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    onSuccess: () => void;
    speak?: (text: string) => void;
    strictMode?: boolean;
    onCheckInteractions?: (name: string) => Promise<string | null>;
}

export const MedicineEntryModal: React.FC<MedicineEntryModalProps & { initialData?: any }> = ({
    isOpen,
    onClose,
    userId,
    onSuccess,
    speak,
    initialData,
    strictMode,
    onCheckInteractions
}) => {
    const [form, setForm] = useState({
        name: '',
        dosage: '',
        time: new Date().toTimeString().slice(0, 5),
        afterMeal: true,
        frequency: 'daily'
    });

    // Reset or Populate form when opening
    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setForm({
                    name: initialData.name,
                    dosage: initialData.dosage,
                    time: initialData.time,
                    afterMeal: initialData.after_meal,
                    frequency: initialData.frequency || 'daily'
                });
            } else {
                setForm({
                    name: '',
                    dosage: '',
                    time: new Date().toTimeString().slice(0, 5),
                    afterMeal: true,
                    frequency: 'daily'
                });
            }
        }
    }, [isOpen, initialData]);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setWarning('');
        if (!form.name || !form.dosage) {
            setError('Please fill in all required fields');
            return;
        }

        // --- AI Strict Mode Check ---
        if (!initialData && strictMode && onCheckInteractions && !warning) {
            setIsSaving(true);
            try {
                const threat = await onCheckInteractions(form.name);
                if (threat) {
                    setWarning(threat);
                    setIsSaving(false);
                    return; // Blocking save until override
                }
            } catch (e) { }
            setIsSaving(false);
        }

        setIsSaving(true);
        setError('');
        try {
            const url = initialData
                ? `${API_BASE_URL}/medicines/${initialData.id}`
                : `${API_BASE_URL}/medicines`;

            const method = initialData ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: initialData?.id, // Included for reference, though usually not needed in body for PUT
                    ...form,
                    after_meal: form.afterMeal,
                    user_id: userId
                })
            });

            if (response.ok) {
                const action = initialData ? 'updated' : 'added';
                if (speak) speak(`Medication ${form.name} has been ${action} successfully.`);
                onSuccess();
                onClose();
            } else {
                setError('Failed to save medicine. Please try again.');
            }
        } catch (err) {
            setError('Connection error. Please check your backend.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-emerald-900/20 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 bg-gradient-to-br from-teal-500 to-emerald-600 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Pill className="w-32 h-32 rotate-12" />
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute right-6 top-6 p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors z-20"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                                    <Pill className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">{initialData ? 'Edit Medicine' : 'Add Medicine'}</h3>
                                    <p className="text-teal-100 font-bold uppercase tracking-widest text-[10px]">{initialData ? 'Update details' : 'Track your daily doses'}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 font-bold text-sm">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            )}

                            {warning && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex flex-col gap-2 shadow-lg">
                                    <div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest text-amber-600">
                                        <AlertCircle className="w-5 h-5" />
                                        Medical Intelligence Alert
                                    </div>
                                    <p className="text-sm font-bold">{warning}</p>
                                    <p className="text-xs opacity-70">Strict Mode is active. Do you still want to add this?</p>
                                    <button
                                        type="button"
                                        onClick={() => { setWarning(''); handleSave(); }}
                                        className="mt-2 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-lg shadow-amber-200"
                                    >
                                        Override & Add Anyway
                                    </button>
                                </motion.div>
                            )}

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Medicine Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                                    className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl font-bold outline-none transition-all placeholder:text-slate-400 text-slate-800"
                                    placeholder="e.g. Paracetamol"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Dosage</label>
                                    <input
                                        type="text"
                                        value={form.dosage}
                                        onChange={e => setForm(s => ({ ...s, dosage: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl font-bold outline-none transition-all placeholder:text-slate-400 text-slate-800"
                                        placeholder="500mg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Preferred Time</label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={form.time}
                                            onChange={e => setForm(s => ({ ...s, time: e.target.value }))}
                                            className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl font-bold outline-none transition-all text-slate-800"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Frequency</label>
                                <select
                                    value={form.frequency}
                                    onChange={e => setForm(s => ({ ...s, frequency: e.target.value }))}
                                    className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl font-bold outline-none transition-all cursor-pointer text-slate-800"
                                >
                                    <option value="daily">Every Day</option>
                                    <option value="weekly">Once a Week</option>
                                    <option value="monthly">Once a Month</option>
                                    <option value="every_other_day">Every Other Day</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">When to take?</label>
                                    <select
                                        value={form.afterMeal ? 'after' : 'before'}
                                        onChange={e => setForm(s => ({ ...s, afterMeal: e.target.value === 'after' }))}
                                        className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl font-bold outline-none transition-all cursor-pointer text-slate-800"
                                    >
                                        <option value="after">After Meal (Recommended)</option>
                                        <option value="before">Before Meal (Empty Stomach)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white rounded-3xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {isSaving ? (
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-6 h-6" />
                                            {initialData ? 'Update' : 'Save'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
