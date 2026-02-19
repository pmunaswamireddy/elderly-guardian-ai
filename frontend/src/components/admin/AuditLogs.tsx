import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, User, HardDrive, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/admin/logs`)
            .then(res => res.json())
            .then(data => {
                setLogs(data.logs || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching logs:", err);
                setIsLoading(false);
            });
    }, []);
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black">Audit Trail</h3>
                    <p className="text-slate-500 font-bold">Chronological security and event log</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-6 py-3 bg-white border border-slate-100 rounded-xl font-black text-xs text-slate-500 hover:bg-slate-50">Export PDF</button>
                    <button className="px-6 py-3 bg-white border border-slate-100 rounded-xl font-black text-xs text-slate-500 hover:bg-slate-50">Export JSON</button>
                </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden min-h-[300px]">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Shield className="w-64 h-64" />
                </div>

                <div className="space-y-4 relative z-10">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-20">
                            <Loader2 className="w-12 h-12 text-white/20 animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-20 text-center">
                            <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-white/30 font-bold uppercase tracking-widest text-xs">No logs recorded yet</p>
                        </div>
                    ) : logs.map((log, idx) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                        >
                            <div className={cn("p-3 rounded-xl",
                                log.action.includes('FAIL') || log.action.includes('BAN') || log.action.includes('DELETE') ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                            )}>
                                {log.action.includes('FAIL') ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            </div>

                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Action</p>
                                    <p className="text-sm font-black text-slate-200">{log.action}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Initiator</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <User className="w-3 h-3 text-slate-500" />
                                        <span className="text-xs font-bold text-slate-400">{log.user_name || `User #${log.user_id}`}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Resource</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <HardDrive className="w-3 h-3 text-slate-500" />
                                        <span className="text-xs font-bold text-slate-400">{log.resource || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="text-right pr-4">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Timestamp</p>
                                    <div className="flex items-center justify-end gap-2 mt-0.5">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        <span className="text-xs font-bold text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {logs.length > 0 && (
                    <button className="w-full mt-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs text-slate-400 hover:bg-white/10 transition-all">
                        Load More Entries
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
