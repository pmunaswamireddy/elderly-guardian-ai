import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, Activity, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { cn } from '../../utils/cn';

interface Proposal {
    id: string;
    title: string;
    description: string;
    type: 'UI' | 'Feature' | 'Performance';
    difficulty: 'Low' | 'Medium' | 'High';
    technical_blueprint?: string;
}

const EvolutionCenter: React.FC = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isApplying, setIsApplying] = useState<string | null>(null);
    const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

    useEffect(() => {
        fetchProposals();
    }, []);

    const fetchProposals = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/evolution/proposals`);
            const data = await res.json();
            setProposals(data.proposals || []);
        } catch (err) {
            console.error("Evolution Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async (id: string) => {
        setIsApplying(id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/evolution/apply/${id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                // Remove the applied proposal
                setTimeout(() => {
                    setProposals(prev => prev.filter(p => p.id !== id));
                    setIsApplying(null);
                    setExpandedProposal(null);
                }, 2000);
            }
        } catch (err) {
            console.error("Apply Error:", err);
            setIsApplying(null);
        }
    };

    return (
        <div className="space-y-8 p-6">
            <header className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-200">
                            <Cpu className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800">AI Evolution Engine</h2>
                    </div>
                    <p className="text-slate-500 font-bold ml-11">Autonomous AI-Driven Modernization for 2026.</p>
                </div>
                <button
                    onClick={fetchProposals}
                    disabled={isLoading}
                    className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    Scan Codebase
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        [1, 2].map(i => (
                            <div key={i} className="h-64 bg-slate-50 rounded-[2.5rem] animate-pulse border-2 border-dashed border-slate-200" />
                        ))
                    ) : proposals.length === 0 ? (
                        <div className="col-span-2 py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                            <Sparkles className="w-12 h-12 text-indigo-200 mb-4" />
                            <h3 className="text-xl font-black text-slate-400">Your system is fully evolved.</h3>
                            <p className="text-slate-400 font-bold">No new modernization proposals found for today.</p>
                        </div>
                    ) : (
                        proposals.map((p) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cn(
                                    "bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between group transition-all",
                                    expandedProposal === p.id ? "ring-4 ring-indigo-500/10 border-indigo-200" : "hover:border-indigo-100"
                                )}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            p.type === 'UI' ? "bg-pink-100 text-pink-600" :
                                                p.type === 'Feature' ? "bg-indigo-100 text-indigo-600" :
                                                    "bg-amber-100 text-amber-600"
                                        )}>
                                            {p.type} Evolution
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-300">
                                            <Zap className="w-3 h-3 fill-current" />
                                            {p.difficulty}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-2">{p.title}</h3>
                                    <p className="text-slate-500 font-bold leading-relaxed">{p.description}</p>

                                    {p.technical_blueprint && (
                                        <div className="mt-6">
                                            <button
                                                onClick={() => setExpandedProposal(expandedProposal === p.id ? null : p.id)}
                                                className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-2"
                                            >
                                                {expandedProposal === p.id ? 'Hide Blueprint' : 'Inspect Blueprint'}
                                                <ArrowRight className={cn("w-4 h-4 transition-transform", expandedProposal === p.id ? "rotate-90" : "")} />
                                            </button>

                                            <AnimatePresence>
                                                {expandedProposal === p.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-4 p-6 bg-slate-900 rounded-3xl overflow-hidden"
                                                    >
                                                        <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-3 tracking-widest">Technical Implementation Strategy</h4>
                                                        <p className="text-slate-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                                                            {p.technical_blueprint}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={() => handleApply(p.id)}
                                        disabled={!!isApplying}
                                        className={cn(
                                            "w-full py-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all",
                                            isApplying === p.id
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-[0.98]"
                                        )}
                                    >
                                        {isApplying === p.id ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Evolving System Core...
                                            </>
                                        ) : (
                                            <>
                                                Initiate Self-Development
                                                <Sparkles className="w-5 h-5 group-hover:scale-125 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <footer className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="font-black text-lg">System Intelligence</h4>
                        <p className="text-slate-400 text-sm font-bold">Project currently in hyper-scale state. Next auto-audit in 24h.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-center px-6">
                        <p className="text-2xl font-black text-indigo-400">99%</p>
                        <p className="text-[10px] font-black uppercase text-slate-500">Stability</p>
                    </div>
                    <div className="text-center px-6 border-l border-white/10">
                        <p className="text-2xl font-black text-emerald-400">A+</p>
                        <p className="text-[10px] font-black uppercase text-slate-500">Evolution Score</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default EvolutionCenter;
