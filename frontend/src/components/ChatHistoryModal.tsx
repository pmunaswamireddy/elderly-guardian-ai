import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, MessageSquare, History, User, Bot, Calendar } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
}

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: ChatMessage[];
}

export const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ isOpen, onClose, history }) => {
    const downloadHistory = () => {
        const headers = ["Timestamp", "Role", "Message"];
        const rows = history.map(msg => [
            new Date(msg.timestamp).toLocaleString(),
            msg.role === 'user' ? "User" : "Guardian AI",
            `"${msg.text.replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `guardian_chat_history_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-sapphire-100 dark:bg-sapphire-900/30 rounded-2xl flex items-center justify-center text-sapphire-600">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-white leading-tight">Interaction Log</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{history.length} Messages Recorded</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {history.length > 0 && (
                                    <button
                                        onClick={downloadHistory}
                                        className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-2 text-sm font-bold"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Export CSV</span>
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                            {history.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
                                    <MessageSquare className="w-16 h-16 mb-4" />
                                    <p className="font-bold">No conversation history yet.</p>
                                    <p className="text-sm">Ask Guardian a question to get started!</p>
                                </div>
                            ) : (
                                history.map((msg, i) => (
                                    <div key={i} className={cn(
                                        "flex gap-4",
                                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                                            msg.role === 'user' ? "bg-slate-100 dark:bg-slate-800 text-slate-600" : "bg-sapphire-500 text-white"
                                        )}>
                                            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                        </div>
                                        <div className={cn(
                                            "max-w-[80%] space-y-1",
                                            msg.role === 'user' ? "items-end" : "items-start"
                                        )}>
                                            <div className={cn(
                                                "p-4 rounded-3xl text-sm font-bold shadow-sm",
                                                msg.role === 'user'
                                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tr-none"
                                                    : "bg-sapphire-50 dark:bg-sapphire-900/20 text-sapphire-900 dark:text-sapphire-100 border border-sapphire-100 dark:border-sapphire-800/50 rounded-tl-none"
                                            )}>
                                                {msg.text}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold px-2">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Tips */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Logs are only stored for this session to protect your privacy.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
