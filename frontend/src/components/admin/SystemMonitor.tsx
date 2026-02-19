import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, HardDrive, Database, Wifi, Clock, Pill, Activity, Users, Calendar, Heart, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

/* ─── types ─── */
interface MonitorData {
    cpu: { percent: number; cores: number };
    memory: { used_gb: number; total_gb: number; percent: number };
    disk: { used_gb: number; total_gb: number; percent: number };
    db: { latency_ms: number; mode: string; users: number; upcoming_appointments: number; pending_medicines: number; vitals_recorded: number };
    network: { sent_mb: number; recv_mb: number };
    system: { uptime: string };
}

/* ─── tiny sparkline component ─── */
const Sparkline: React.FC<{ history: number[]; color: string }> = ({ history, color }) => (
    <svg viewBox={`0 0 ${history.length * 8} 32`} className="w-full h-8" preserveAspectRatio="none">
        <polyline
            points={history.map((v, i) => `${i * 8},${32 - (v / 100) * 32}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/* ─── arc gauge ─── */
const ArcGauge: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
    const r = 26, cx = 32, cy = 32;
    const circ = 2 * Math.PI * r;
    const dash = (percent / 100) * circ;
    return (
        <svg width="64" height="40" viewBox="0 0 64 64">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" strokeDasharray={`${circ / 2} ${circ}`} strokeLinecap="round" transform="rotate(180 32 32)" />
            <motion.circle
                cx={cx} cy={cy} r={r}
                fill="none" stroke={color} strokeWidth="6"
                strokeDasharray={`${dash / 2} ${circ}`}
                strokeLinecap="round"
                transform="rotate(180 32 32)"
                initial={{ strokeDasharray: `0 ${circ}` }}
                animate={{ strokeDasharray: `${dash / 2} ${circ}` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />
        </svg>
    );
};

/* ─── main component ─── */
const SystemMonitor: React.FC = () => {
    const [stats, setStats] = useState<MonitorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);
    const cpuHistory = useRef<number[]>(Array(20).fill(0));

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/monitor`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: MonitorData = await res.json();
            setStats(data);
            setError(null);
            cpuHistory.current = [...cpuHistory.current.slice(1), data.cpu.percent];
            setLastRefresh(new Date());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
            <Loader2 className="w-12 h-12 text-sapphire-500 animate-spin" />
            <p className="text-slate-400 font-bold text-sm">Booting diagnostics…</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-red-400 font-bold text-sm">Monitor offline: {error}</p>
            <button onClick={fetchStats} className="px-6 py-3 bg-slate-100 rounded-xl font-black text-sm hover:bg-slate-200 transition-colors">Retry</button>
        </div>
    );

    const s = stats!;
    const ram = s.memory;
    const cpu = s.cpu;
    const disk = s.disk;
    const db = s.db;
    const net = s.network;

    /* ─── card definitions ─── */
    const gaugeCards = [
        {
            label: 'CPU Load',
            value: `${cpu.percent}%`,
            sub: `${cpu.cores} cores`,
            percent: cpu.percent,
            color: cpu.percent > 80 ? '#f87171' : cpu.percent > 50 ? '#fbbf24' : '#34d399',
            icon: Cpu,
            theme: 'dark',
        },
        {
            label: 'RAM Usage',
            value: `${ram.used_gb} GB`,
            sub: `of ${ram.total_gb} GB`,
            percent: ram.percent,
            color: ram.percent > 85 ? '#f87171' : '#818cf8',
            icon: Activity,
            theme: 'light',
        },
        {
            label: 'Disk Space',
            value: `${disk.used_gb} GB`,
            sub: `of ${disk.total_gb} GB`,
            percent: disk.percent,
            color: disk.percent > 90 ? '#f87171' : '#fb923c',
            icon: HardDrive,
            theme: 'blue',
        },
    ];

    const healthCards = [
        { label: 'DB Latency', value: db.latency_ms >= 0 ? `${db.latency_ms}ms` : 'N/A', sub: `Mode: ${db.mode}`, icon: Database, ok: db.latency_ms >= 0 && db.latency_ms < 50 },
        { label: 'Network Sent', value: `${net.sent_mb} MB`, sub: `Recv: ${net.recv_mb} MB`, icon: Wifi, ok: true },
        { label: 'Server Uptime', value: s.system.uptime, sub: 'Since last restart', icon: Clock, ok: true },
    ];

    const appCards = [
        { label: 'Registered Users', value: db.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
        { label: 'Upcoming Appts', value: db.upcoming_appointments, icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
        { label: 'Pending Meds', value: db.pending_medicines, icon: Pill, color: db.pending_medicines > 0 ? 'text-amber-500' : 'text-emerald-500', bg: db.pending_medicines > 0 ? 'bg-amber-50' : 'bg-emerald-50', border: db.pending_medicines > 0 ? 'border-amber-100' : 'border-emerald-100' },
        { label: 'Vitals Logged', value: db.vitals_recorded, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black">System Diagnostics</h3>
                    <p className="text-slate-400 text-sm font-bold mt-1">Live metrics · refreshes every 5s</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors text-[11px] font-black uppercase tracking-widest text-slate-600"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                </button>
            </div>

            {/* Gauge Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {gaugeCards.map((card, idx) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        className={cn(
                            'p-8 rounded-[3rem] border relative overflow-hidden',
                            card.theme === 'dark' ? 'bg-slate-900 border-white/5 text-white' :
                            card.theme === 'blue' ? 'bg-sapphire-600 border-sapphire-500 text-white' :
                            'bg-white border-slate-100 text-slate-800 shadow-xl'
                        )}
                    >
                        {/* glow blob */}
                        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: card.color }} />

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', card.theme !== 'light' ? 'text-white/50' : 'text-slate-400')}>{card.label}</p>
                                <div className="text-4xl font-black">{card.value}</div>
                                <p className={cn('text-xs font-bold mt-1', card.theme !== 'light' ? 'text-white/40' : 'text-slate-400')}>{card.sub}</p>
                            </div>
                            <ArcGauge percent={card.percent} color={card.color} />
                        </div>

                        {/* progress bar */}
                        <div className={cn('h-1.5 rounded-full overflow-hidden mt-4', card.theme !== 'light' ? 'bg-white/10' : 'bg-slate-100')}>
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: card.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${card.percent}%` }}
                                transition={{ duration: 0.8 }}
                            />
                        </div>

                        {/* CPU sparkline only */}
                        {card.label === 'CPU Load' && (
                            <div className="mt-4 opacity-60">
                                <Sparkline history={cpuHistory.current} color={card.color} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {healthCards.map((card, idx) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.24 + idx * 0.08, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        className="p-7 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex items-center gap-5"
                    >
                        <div className={cn('p-4 rounded-2xl', card.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                            <card.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{card.label}</p>
                            <div className="text-xl font-black text-slate-800">{card.value}</div>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{card.sub}</p>
                        </div>
                        {card.ok
                            ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        }
                    </motion.div>
                ))}
            </div>

            {/* Healthcare App KPIs */}
            <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-sm">
                <h4 className="text-lg font-black mb-6 flex items-center gap-3">
                    <Heart className="w-5 h-5 text-rose-500" />
                    Guardian App Health
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {appCards.map((card, idx) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + idx * 0.07, duration: 0.5 }}
                            className={cn('p-6 rounded-[2rem] border flex flex-col gap-3', card.bg, card.border)}
                        >
                            <div className={cn('p-3 rounded-xl self-start', card.bg)}>
                                <card.icon className={cn('w-5 h-5', card.color)} />
                            </div>
                            <div className="text-3xl font-black text-slate-800">{card.value}</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] font-bold text-slate-400 pb-2">
                Last updated {lastRefresh.toLocaleTimeString()} · Powered by psutil
            </p>
        </div>
    );
};

export default SystemMonitor;
