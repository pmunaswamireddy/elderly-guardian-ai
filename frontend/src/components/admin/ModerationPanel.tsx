import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, User, MessageSquare, CheckCircle, Loader2, Clock } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface Report {
    id: number;
    reporter_id: number;
    reporter_name: string;
    reported_id: number;
    reported_name: string;
    channel_id: string;
    channel_name: string;
    reason: string;
    timestamp: string;
}

const ModerationPanel: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/reports`);
            const data = await res.json();
            setReports(data.reports || []);
        } catch (err) {
            console.error("Moderation Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id: number, action: 'dismiss' | 'ban', reportedId?: number) => {
        try {
            const endpoint = action === 'dismiss' ? 'dismiss' : 'resolve';
            const adminId = currentUser?.id || 1;
            const res = await fetch(`${API_BASE_URL}/admin/reports/${id}/${endpoint}?admin_id=${adminId}`, { method: 'POST' });

            if (res.ok) {
                if (action === 'ban' && reportedId) {
                    // Also perform the ban
                    await fetch(`${API_BASE_URL}/admin/users/${reportedId}/ban?admin_id=${adminId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: "Banned via moderation report", admin_id: adminId })
                    });
                }
                setReports(prev => prev.filter(r => r.id !== id));
            }
        } catch (err) {
            console.error("Action Error:", err);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Moderation Queue</h3>
                    <p className="text-slate-500 font-bold italic">Protecting the community since 2026</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-red-100 rounded-xl text-red-600 font-black text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {reports.length} Active Reports
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative min-h-[400px]">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                        <Loader2 className="w-12 h-12 text-sapphire-600 animate-spin" />
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-32 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-800">Queue is Clear</h4>
                        <p className="text-slate-400 font-bold mt-2">No pending user reports found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        <AnimatePresence>
                            {reports.map((r) => (
                                <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="p-8 hover:bg-slate-50/50 transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest">High Priority</div>
                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(r.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Reporter</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                            <User className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                        <span className="font-black text-slate-800">{r.reporter_name}</span>
                                                    </div>
                                                </div>

                                                <div className="w-10 h-px bg-slate-100" />

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-1">Reported User</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-black text-red-600">{r.reported_name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 w-full max-w-2xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare className="w-4 h-4 text-slate-400" />
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reason for Report</span>
                                                </div>
                                                <p className="text-slate-600 font-bold leading-relaxed">{r.reason}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleAction(r.id, 'ban', r.reported_id)}
                                                className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                                            >
                                                Ban Reported User
                                            </button>
                                            <button
                                                onClick={() => handleAction(r.id, 'dismiss')}
                                                className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-50 transition-all"
                                            >
                                                Dismiss Report
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModerationPanel;
