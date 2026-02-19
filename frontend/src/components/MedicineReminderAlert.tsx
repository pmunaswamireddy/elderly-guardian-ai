import React from 'react';
import { motion } from 'framer-motion';
import { Pill, X, Check, Clock, AlertCircle } from 'lucide-react';

interface MedicineReminderAlertProps {
    medicine: any;
    onClose: () => void;
    onMarkAsTaken: (id: number) => void;
    onReplay?: () => void;
}

export const MedicineReminderAlert: React.FC<MedicineReminderAlertProps> = ({
    medicine,
    onClose,
    onMarkAsTaken,
    onReplay
}) => {
    if (!medicine) return null;

    return (
        <div className="fixed inset-x-0 top-10 z-[3000] flex justify-center px-4 pointer-events-none">
            <motion.div
                initial={{ y: -100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -100, opacity: 0, scale: 0.9 }}
                className="w-full max-w-xl bg-slate-900 border-2 border-blue-500 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto"
            >
                <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                            <Pill className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Time for Medication!</h3>
                            <p className="text-blue-100 text-sm font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Scheduled at {medicine.time}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex items-start gap-6 mb-8">
                        <div className="flex-1">
                            <h4 className="text-4xl font-black text-white mb-2">{medicine.name}</h4>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-4 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-full text-sm font-black uppercase tracking-widest magic-tile">
                                    {medicine.dosage}
                                </span>
                                <span className="px-4 py-1.5 bg-emerald-900/50 text-emerald-400 border border-emerald-800 rounded-full text-sm font-black uppercase tracking-widest magic-tile">
                                    {medicine.after_meal ? 'After Meal' : 'Before Meal'}
                                </span>
                                {onReplay && (
                                    <button onClick={onReplay} className="px-4 py-1.5 bg-blue-900/50 text-blue-300 border border-blue-800 rounded-full text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-800 transition-colors magic-button">
                                        <AlertCircle className="w-4 h-4" /> Replay Voice
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="w-24 h-24 bg-blue-900/30 border border-blue-500/30 rounded-[2rem] flex items-center justify-center magic-tile">
                            <AlertCircle className="w-12 h-12 text-blue-400 animate-pulse" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => onMarkAsTaken(medicine.id)}
                            className="bg-emerald-500 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-lg shadow-emerald-900/50 hover:scale-[1.05] active:scale-95 transition-all text-lg flex items-center justify-center gap-3 magic-button border-t border-white/20"
                        >
                            <Check className="w-6 h-6" />
                            Mark as Taken
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-slate-800 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-lg shadow-black/40 hover:scale-[1.02] active:scale-95 transition-all text-lg flex items-center justify-center gap-3 magic-button border-t border-white/10 hover:bg-slate-700"
                        >
                            <Clock className="w-6 h-6" />
                            Snooze
                        </button>
                    </div>

                    <p className="mt-6 text-center text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">
                        Your AI Assistant will remind you every 2 minutes until confirmed.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
