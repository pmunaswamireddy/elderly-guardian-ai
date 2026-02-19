import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, ShieldCheck, Database, FileText, LayoutDashboard, Map as MapIcon, UserCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';
import LiveUserMap from './LiveUserMap';
import AdminProfile from './AdminProfile';
import type { AdminStats, AdminTask } from '../../types';

const AdminOverview: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [tasks, setTasks] = useState<AdminTask[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'profile'>('overview');

    const handleClearData = async () => {
        if (!window.confirm("CRITICAL: Wipe all system data (users, vitals, meds)? This cannot be undone.")) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/admin/clear-data`, { method: 'POST' });
            if (res.ok) {
                window.location.reload();
            }
        } catch (err) {
            console.error("Purge failed:", err);
        }
    };

    useEffect(() => {
        // Fetch KPI stats
        fetch(`${API_BASE_URL}/admin/stats`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Error fetching stats:", err));

        // Fetch tasks
        fetch(`${API_BASE_URL}/admin/tasks`)
            .then(res => res.json())
            .then(data => setTasks(data.tasks || []))
            .catch(err => console.error("Error fetching tasks:", err));
    }, []);

    const kpiItems = [
        { label: 'Total Users', value: stats?.total_users || '0', change: '+2%', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'App Uptime', value: stats?.uptime || '99.9%', change: 'Stable', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Content Items', value: stats?.total_content || '0', change: '+5%', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        { label: 'Media Assets', value: stats?.total_media || '0', change: '+1%', icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    ];

    return (
        <div className="space-y-10 min-h-screen bg-slate-950 text-white p-8 rounded-[3rem] border border-white/5 shadow-inner">
            {/* Navigation Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent italic tracking-tight">ADMIN COMMAND</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Guardian System Management</p>
                </div>
                
                <div className="flex bg-slate-900/50 backdrop-blur-3xl p-2 rounded-[2rem] border border-white/5 shadow-2xl">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'map', label: 'Live Grid', icon: MapIcon },
                        { id: 'profile', label: 'Identity', icon: UserCircle },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'overview' | 'map' | 'profile')}
                            className={cn(
                                "flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-black transition-all duration-500 text-sm",
                                activeTab === tab.id 
                                    ? "bg-indigo-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.3)] scale-105" 
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'map' ? (
                <div className="animate-in fade-in zoom-in-95 duration-700">
                    <LiveUserMap />
                </div>
            ) : activeTab === 'profile' ? (
                <div className="animate-in fade-in slide-in-from-right-10 duration-700">
                    <AdminProfile />
                </div>
            ) : (
                <div className="space-y-10 animate-in fade-in duration-1000">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {kpiItems.map((kpi, idx) => (
                            <motion.div
                                key={kpi.label}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                                className={cn("p-8 bg-white/5 rounded-[2.5rem] border hover:border-white/10 transition-all group relative overflow-hidden", kpi.border)}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-10 -mt-10" />
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn("p-5 rounded-2xl shadow-xl", kpi.bg, kpi.color)}>
                                        <kpi.icon className="w-7 h-7" />
                                    </div>
                                    <span className={cn("text-[10px] font-black px-3 py-1.5 rounded-xl border border-white/5",
                                        kpi.change.startsWith('+') ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 bg-white/5"
                                    )}>
                                        {kpi.change}
                                    </span>
                                </div>
                                <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">{kpi.label}</h4>
                                <div className="text-4xl font-black text-white tracking-tight">{kpi.value}</div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Primary Management Center */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-10 bg-white/5 border border-white/5 rounded-[3.5rem] shadow-2xl flex flex-col min-h-[400px]"
                        >
                            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]" />
                                Active Priorities
                            </h3>
                            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                                {tasks && tasks.length > 0 ? (
                                    tasks.map((task, idx) => (
                                        <div key={task.label || idx} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-transparent hover:border-white/5 cursor-pointer group">
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors", task.highlight ? "text-red-400" : "text-slate-400")}>{task.label}</span>
                                            <span className="bg-slate-900 border border-white/5 px-4 py-2 rounded-xl text-xs font-black shadow-inner text-indigo-400">{task.count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <ShieldCheck className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-emerald-400 font-black text-sm uppercase tracking-widest">System Secured</h4>
                                            <p className="text-[10px] text-slate-500 font-bold mt-1">No pending administrative actions</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-4 mt-8 pt-8 border-t border-white/5">
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="flex-1 py-5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 transition-all active:scale-95"
                                >
                                    Refresh Grid
                                </button>
                                <button 
                                    onClick={handleClearData}
                                    className="px-8 py-5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-red-500 transition-all active:scale-95"
                                >
                                    Purge Environment
                                </button>
                            </div>
                        </motion.div>

                        {/* Additional Stats/Insights (Placeholders for real metrics later) */}
                        <div className="grid grid-rows-2 gap-8">
                            <div className="p-8 bg-white/5 border border-white/5 rounded-[3.5rem] flex flex-col justify-center">
                                <Activity className="w-8 h-8 text-slate-500 mb-4" />
                                <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">System Integrity</h4>
                                <div className="text-3xl font-black mt-2">100.0%</div>
                                <div className="mt-4 bg-emerald-500/20 h-1.5 rounded-full w-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full w-full" />
                                </div>
                            </div>
                            <div className="p-8 bg-white/5 border border-white/5 rounded-[3.5rem] flex flex-col justify-center">
                                <Users className="w-8 h-8 text-slate-500 mb-4" />
                                <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Active Sessions</h4>
                                <div className="text-3xl font-black mt-2">{stats?.total_users || '0'}</div>
                                <p className="text-[10px] text-slate-500 font-bold mt-2">Total registered users in grid</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOverview;
