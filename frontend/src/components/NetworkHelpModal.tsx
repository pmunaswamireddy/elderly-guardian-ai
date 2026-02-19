import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, X, Copy, ExternalLink, ShieldAlert, Check } from 'lucide-react';

interface NetworkHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NetworkHelpModal: React.FC<NetworkHelpModalProps> = ({ isOpen, onClose }) => {
    const currentOrigin = window.location.origin;
    const [isCopied, setIsCopied] = React.useState(false);

    const copyToClipboard = () => {
        // Fallback for insecure origins where navigator.clipboard might be missing
        if (!navigator.clipboard) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = currentOrigin;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            return;
        }

        navigator.clipboard.writeText(currentOrigin)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            })
            .catch(err => {
                console.error('Clipboard API failed', err);
            });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                    >
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                                <ShieldAlert className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-black text-slate-800 dark:text-white">Connection Issue</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Microphone blocked by browser security</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Browsers block microphone access on network addresses (like <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono text-sm">{currentOrigin}</code>) unless they use HTTPS.
                            </p>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 space-y-4">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Wifi className="w-4 h-4 text-blue-500" />
                                    How to fix for Network Testing:
                                </h3>

                                <ol className="space-y-4 text-sm text-slate-600 list-decimal pl-4 marker:font-bold marker:text-slate-400">
                                    <li className="text-slate-600 dark:text-slate-400">
                                        Open a new tab and allow insecure origins:
                                        <div className="mt-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg font-mono text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center select-all">
                                            chrome://flags/#unsafely-treat-insecure-origin-as-secure
                                        </div>
                                    </li>
                                    <li className="text-slate-600 dark:text-slate-400">
                                        In the text box, paste your current address:
                                        <div className="mt-2 flex gap-2">
                                            <code className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg font-mono text-xs text-blue-600 dark:text-blue-400 truncate">
                                                {currentOrigin}
                                            </code>
                                            <button
                                                onClick={copyToClipboard}
                                                className={`p-2 rounded-lg transition-colors ${isCopied ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                    }`}
                                                title="Copy"
                                            >
                                                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </li>
                                    <li className="text-slate-600 dark:text-slate-400">
                                        Select <strong>Enabled</strong> from the dropdown and click <strong>Relaunch</strong>.
                                    </li>
                                </ol>
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-2">Or, on this computer only:</p>
                                <a href="http://localhost:3001" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                                    <ExternalLink className="w-4 h-4" />
                                    Switch to localhost:3001
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
