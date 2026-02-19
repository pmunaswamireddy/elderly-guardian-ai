import React, { useEffect, useState } from 'react';
import { Cloud, HardDrive, RefreshCw, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

const DatabaseManager: React.FC = () => {
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [syncing, setSyncing] = useState<'push' | 'pull' | null>(null);
    const [toggling, setToggling] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/db/status`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setStatus(data);
        } catch (err: any) {
            console.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleSync = async (direction: 'push' | 'pull') => {
        if (!window.confirm(`Are you sure you want to perform a ${direction === 'push' ? 'Local-to-Cloud' : 'Cloud-to-Local'} sync? This may overwrite existing data.`)) return;

        setSyncing(direction);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/db/sync?direction=${direction}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert(`Sync ${direction} completed successfully!`);
                await fetchStatus();
            } else {
                throw new Error("Sync failed");
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSyncing(null);
        }
    };

    const handleToggleMode = async () => {
        const currentDb = status?.active_db;
        const msg = currentDb === 'SQLite'
            ? "Switch to Supabase (Cloud)? Ensure you have synced your data first."
            : "Switch to SQLite (Local)? Ensure you have downloaded cloud data if needed.";

        if (!window.confirm(msg)) return;

        setToggling(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/db/toggle`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                // Optimistically update the button label immediately
                const newDb = currentDb === 'SQLite' ? 'Supabase' : 'SQLite';
                setStatus((prev: any) => ({ ...prev, active_db: newDb }));
                alert(data.message + "\n\nNote: A backend restart is required for the change to fully take effect.");
            } else {
                alert("Toggle failed: " + (data.message || "Unknown error"));
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setToggling(false);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center p-20">
            <Loader2 className="w-12 h-12 text-sapphire-600 animate-spin" />
        </div>
    );

    const tables = status?.tables ? Object.entries(status.tables) : [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-black">Storage Management</h3>
                    <p className="text-slate-500 font-bold">Synchronize data between local and cloud databases</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleToggleMode}
                        disabled={toggling}
                        className={cn(
                            "px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl",
                            status?.active_db === 'SQLite' ? "bg-slate-900 text-white" : "bg-sapphire-600 text-white"
                        )}
                    >
                        {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Switch to {status?.active_db === 'SQLite' ? 'Supabase' : 'SQLite'}
                    </button>
                </div>
            </div>

            {/* DB Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Local SQLite */}
                <div className={cn(
                    "p-8 rounded-[3rem] border-4 transition-all relative overflow-hidden",
                    status?.active_db === 'SQLite' ? "bg-white border-emerald-500 shadow-2xl" : "bg-slate-50 border-slate-100 opacity-80"
                )}>
                    {status?.active_db === 'SQLite' && (
                        <div className="absolute top-6 right-8 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Active</div>
                    )}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-slate-900 text-white rounded-2xl">
                            <HardDrive className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black">SQLite Base</h4>
                            <p className="text-xs font-bold text-slate-400">Localhost Storage</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('push')}
                        disabled={syncing !== null}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"
                    >
                        {syncing === 'push' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
                        Sync to Supabase
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Cloud Supabase */}
                <div className={cn(
                    "p-8 rounded-[3rem] border-4 transition-all relative overflow-hidden",
                    status?.active_db === 'Supabase' ? "bg-white border-sapphire-500 shadow-2xl" : "bg-slate-50 border-slate-100 opacity-80"
                )}>
                    {status?.active_db === 'Supabase' && (
                        <div className="absolute top-6 right-8 bg-sapphire-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Active</div>
                    )}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-sapphire-600 text-white rounded-2xl">
                            <Cloud className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black">Supabase Cloud</h4>
                            <p className="text-xs font-bold text-slate-400">PostgreSQL Backend</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('pull')}
                        disabled={syncing !== null}
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg"
                    >
                        {syncing === 'pull' ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5" />}
                        <ArrowLeft className="w-4 h-4" />
                        Fill Local from Cloud
                    </button>
                </div>
            </div>

            {/* Table Comparison */}
            <div className="glass-card p-10 bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h4 className="text-xl font-black">Data Parity Report</h4>
                    <button onClick={fetchStatus} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-sapphire-600 transition-colors">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                                <th className="pb-4">Table Name</th>
                                <th className="pb-4">Local Count</th>
                                <th className="pb-4">Cloud Count</th>
                                <th className="pb-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tables.map(([name, counts]: [string, any]) => (
                                <tr key={name} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 font-black text-slate-700 capitalize">{name.replace('_', ' ')}</td>
                                    <td className="py-4 font-bold text-slate-500">{counts.local}</td>
                                    <td className="py-4 font-bold text-slate-500">{counts.cloud}</td>
                                    <td className="py-4">
                                        {counts.diff === 0 ? (
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase">Synced</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase">{counts.diff} Row Diff</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] flex gap-4">
                <AlertTriangle className="w-12 h-12 text-amber-500 flex-shrink-0" />
                <div>
                    <h5 className="font-black text-amber-800 uppercase text-xs tracking-widest">Sync Warning</h5>
                    <p className="text-sm text-amber-900/70 font-bold mt-1">
                        Performing a sync will physically copy data between your local machine and the cloud.
                        Always ensure your internet connection is stable before starting a large data transfer.
                        Mode changes require a backend restart to take effect completely.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DatabaseManager;
