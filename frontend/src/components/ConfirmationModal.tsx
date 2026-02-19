import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info' | 'success';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    type = 'danger'
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-4 rounded-2xl ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-sapphire-50 text-sapphire-500'}`}>
                                {type === 'danger' ? <Trash2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">{title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
                            </div>

                            <div className="flex w-full gap-3 pt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 px-6 border-2 border-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    {cancelLabel}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 py-4 px-6 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${type === 'danger' ? 'bg-red-500 shadow-red-500/30 hover:bg-red-600' : (type === 'success' ? 'bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600' : 'bg-sapphire-500 shadow-sapphire-500/30 hover:bg-sapphire-600')
                                        }`}
                                >
                                    {confirmLabel}
                                </button>
                            </div>
                        </div>

                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-50 rounded-full text-slate-300 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
