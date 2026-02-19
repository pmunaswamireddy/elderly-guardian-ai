import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Clock, Trash2, Edit2, CheckCircle2, Check, AlertCircle, History, Calendar, AlertTriangle, Coffee } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Medicine {
    id: number;
    name: string;
    dosage: string;
    time: string;
    after_meal: boolean;
    frequency?: string;
    taken: boolean;
    last_taken_at?: string;
}

interface MedicineHistoryItem {
    id: number;
    medicine_id: number;
    medicine_name: string;
    status: string;
    taken_at: string;
}

interface MedicineListProps {
    userId: number;
    medicines: Medicine[];
    onDelete: (id: number) => void;
    onEdit: (medicine: Medicine) => void;
    onMarkTaken: (id: number) => void;
}

// Helper Function
const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
};

// Standalone Component to prevent re-renders
const MedicineCard = ({
    med,
    type,
    onMarkTaken,
    onEdit,
    onDelete
}: {
    med: Medicine,
    type: 'missed' | 'scheduled' | 'completed',
    onMarkTaken: (id: number) => void,
    onEdit: (med: Medicine) => void,
    onDelete: (id: number) => void
}) => {
    const theme = {
        missed: {
            bg: 'bg-white/20 backdrop-blur-md',
            hoverBg: 'hover:bg-white/30',
            border: 'border-rose-100',
            shadow: 'shadow-rose-100/10',
            iconBg: 'bg-rose-100 text-rose-600',
            title: '',
            badge: 'bg-rose-100 text-rose-700',
            btn: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
        },
        scheduled: {
            bg: 'bg-white/20 backdrop-blur-md',
            hoverBg: 'hover:bg-white/30',
            border: 'border-indigo-100/50',
            hoverBorder: 'hover:border-sapphire-200',
            shadow: 'shadow-indigo-100/10',
            iconBg: 'bg-gradient-to-br from-indigo-500 to-sapphire-500 text-white shadow-sapphire-200',
            title: '',
            badge: 'bg-indigo-50 text-indigo-700',
            btn: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
        },
        completed: {
            bg: 'bg-white/10 backdrop-blur-sm',
            hoverBg: 'hover:bg-white/20',
            border: 'border-emerald-200/50',
            shadow: 'shadow-emerald-100/10',
            iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white',
            title: 'opacity-75',
            badge: 'bg-emerald-100 text-emerald-700',
            btn: ''
        }
    }[type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            whileHover={{
                scale: 1.04,
                y: -4,
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.3)"
            }}
            className={`group relative overflow-hidden rounded-[2.5rem] p-7 ${theme.bg} ${theme.hoverBg} ${theme.shadow} cursor-pointer transition-all duration-150 magic-tile`}
        >
            {/* Animated Background Model (Vibrant Glows) */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        x: [0, 20, 0],
                        y: [0, -10, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full blur-[40px]"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [0, -90, 0],
                        x: [0, -20, 0],
                        y: [0, 10, 0]
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-full blur-[40px]"
                />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left Side: Info */}
                <div className="flex gap-5 items-center">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`p-4 rounded-2xl shadow-lg shrink-0 ${theme.iconBg} relative overflow-hidden group-hover:shadow-xl transition-all`}
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {type === 'completed' ? <CheckCircle2 className="w-7 h-7" /> : type === 'missed' ? <AlertCircle className="w-7 h-7" /> : <Pill className="w-7 h-7" />}
                    </motion.div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-black tracking-tight mb-0.5">
                            {med.name}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                            {type === 'missed' && "⚠️ Action needed: Take this dose now"}
                            {type === 'scheduled' && "⏳ Coming up: Take at scheduled time"}
                            {type === 'completed' && "✅ Well done: You've completed this dose"}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black ${theme.badge} magic-tile`}>
                                <Clock className="w-3.5 h-3.5" /> {formatTime(med.time)}
                            </span>
                            <span className="px-2.5 py-1 bg-slate-100/50 text-slate-500 rounded-lg text-xs font-black uppercase tracking-wider magic-tile">
                                {med.dosage}
                            </span>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black bg-sapphire-50/50 text-sapphire-600 border-sapphire-100 magic-tile`}>
                                <Calendar className="w-3.5 h-3.5" /> {med.frequency || 'Every Day'}
                            </span>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black ${med.after_meal ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' : 'bg-teal-50/50 text-teal-600 border-teal-100'} magic-tile`}>
                                <Coffee className="w-3.5 h-3.5" /> {med.after_meal ? 'After Meal' : 'Before Meal'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Single Row Actions */}
                <div className="flex items-center gap-2">
                    {type !== 'completed' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); onMarkTaken(med.id); }}
                            className={`flex items-center gap-2 px-5 py-2.5 text-white font-black rounded-xl shadow-lg transition-all ${theme.btn} text-xs uppercase tracking-widest whitespace-nowrap mr-2 magic-button`}
                        >
                            <Check className="w-4 h-4" /> Mark as Taken
                        </motion.button>
                    )}

                    <div className="flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: '#4f46e5' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); onEdit(med); }}
                            className="p-2.5 bg-slate-100 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer magic-button"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: '#e11d48' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); onDelete(med.id); }}
                            className="p-2.5 bg-slate-100 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer magic-button"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


export const MedicineList: React.FC<MedicineListProps> = ({ userId, medicines, onDelete, onEdit, onMarkTaken }) => {

    const [history, setHistory] = useState<MedicineHistoryItem[]>([]);
    const [daysToShow, setDaysToShow] = useState<number>(7);

    const fetchHistory = async (days: number = daysToShow) => {
        if (!userId) return;
        console.log(`[MedicineList] Fetching history for user ${userId} for ${days} days...`);
        try {
            const res = await fetch(`${API_BASE_URL}/medicines/history?user_id=${userId}&days=${days}`);
            const data = await res.json();
            if (data.success) {
                setHistory(data.history || []);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    useEffect(() => {
        fetchHistory(daysToShow);
    }, [medicines, userId, daysToShow]);

    const handleDeleteHistory = async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/medicines/history/${id}`, { method: 'DELETE' });
            fetchHistory();
        } catch (e) { }
    };

    // Export Logic
    const exportData = (format: 'json' | 'csv' | 'excel') => {
        if (!history.length) return;

        const filename = `medicine_history_${new Date().toISOString().split('T')[0]}`;

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.json`;
            a.click();
        } else {
            // CSV / Excel (CSV is Excel compatible)
            const headers = ['ID', 'Medicine', 'Status', 'Date', 'Time'];
            const rows = history.map(h => [
                h.id,
                h.medicine_name,
                h.status,
                new Date(h.taken_at).toLocaleDateString(),
                new Date(h.taken_at).toLocaleTimeString()
            ]);

            const content = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.${format === 'excel' ? 'csv' : 'csv'}`;
            a.click();
        }
    };

    // Helper to categorize medicines
    const getGroupedMedicines = () => {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const missed: Medicine[] = [];
        const scheduled: Medicine[] = [];
        const completed: Medicine[] = [];

        medicines.forEach(med => {
            if (med.taken) {
                completed.push(med);
            } else {
                const [hours, minutes] = med.time.split(':').map(Number);
                const medTime = hours * 60 + minutes;

                if (medTime < currentTime - 6) {
                    missed.push(med);
                } else {
                    scheduled.push(med);
                }
            }
        });

        const timeSort = (a: Medicine, b: Medicine) => a.time.localeCompare(b.time);

        return {
            missed: missed.sort(timeSort),
            scheduled: scheduled.sort(timeSort),
            completed: completed.sort(timeSort)
        };
    };

    const { missed, scheduled, completed } = getGroupedMedicines();

    // Group logs by Date AND Status
    const groupedLogsByDate = history.reduce((acc: any, log: MedicineHistoryItem) => {
        const date = new Date(log.taken_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!acc[date]) acc[date] = { taken: [], missed: [] };
        if (log.status === 'taken') acc[date].taken.push(log);
        else acc[date].missed.push(log);
        return acc;
    }, {} as any);

    return (
        <div className="space-y-8 pb-20">
            <AnimatePresence mode="popLayout">
                {medicines.length === 0 && (
                    <motion.div key="no-meds" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card text-center p-12 text-slate-800 dark:text-slate-300 font-medium">
                        <Pill className="w-16 h-16 mx-auto mb-4 text-slate-600 dark:text-slate-500 opacity-50" />
                        <p className="text-xl font-bold">No medicines added.</p>
                    </motion.div>
                )}

                {/* TODAY CATEGORIES */}
                {missed.length > 0 && (
                    <motion.div key="section-missed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                        <div className="ml-4 mb-2">
                            <h4 className="text-rose-500 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Incomplete Doses
                            </h4>
                        </div>
                        {missed.map((med, idx) => (
                            <MedicineCard
                                key={`missed-${med.id}-${idx}`}
                                med={med}
                                type="missed"
                                onMarkTaken={onMarkTaken}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </motion.div>
                )}

                {scheduled.length > 0 && (
                    <motion.div key="section-scheduled" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                        <div className="ml-4 mb-2">
                            <h4 className="text-sapphire-500 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                <Clock className="w-5 h-5" /> Your Schedule Today
                            </h4>
                        </div>
                        {scheduled.map((med, idx) => (
                            <MedicineCard
                                key={`scheduled-${med.id}-${idx}`}
                                med={med}
                                type="scheduled"
                                onMarkTaken={onMarkTaken}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </motion.div>
                )}

                {completed.length > 0 && (
                    <motion.div key="section-completed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                        <div className="ml-4 mb-2">
                            <h4 className="text-emerald-500 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Completed Today
                            </h4>
                        </div>
                        {completed.map((med, idx) => (
                            <MedicineCard
                                key={`completed-${med.id}-${idx}`}
                                med={med}
                                type="completed"
                                onMarkTaken={onMarkTaken}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </motion.div>
                )}

                {/* HISTORY LOG SECTION */}
                {/* HISTORY LOG SECTION */}
                {/* HISTORY LOG SECTION */}
                <motion.div key="section-history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-16 bg-blue-100 dark:bg-slate-900 p-10 relative overflow-hidden magic-tile rounded-[3rem] border-2 border-dashed border-blue-300 dark:border-slate-700 shadow-2xl">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-[2rem] shadow-2xl rotate-3">
                                <History className="w-10 h-10" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-5xl font-black tracking-tighter">Medical Records</h2>
                                <p className="text-slate-600 dark:text-slate-300 font-black uppercase tracking-[0.2em] text-xs mt-1 opacity-80 whitespace-nowrap">Verified Adherence Log</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4 shadow-inner">
                                <button
                                    onClick={() => setDaysToShow(7)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${daysToShow === 7 ? 'bg-white shadow-lg text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    LAST 7 DAYS
                                </button>
                                <button
                                    onClick={() => setDaysToShow(60)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${daysToShow === 60 ? 'bg-white shadow-lg text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    60-DAY HISTORY
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => exportData('json')} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all shadow-lg magic-button">JSON</button>
                                <button onClick={() => exportData('csv')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg magic-button">CSV</button>
                                <button onClick={() => exportData('excel')} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all shadow-lg magic-button">EXCEL</button>
                            </div>
                        </div>
                    </div>

                    {history.length > 0 ? (
                        <div className="space-y-16">
                            {Object.entries(groupedLogsByDate).map(([date, groups]: [string, any]) => (
                                <div key={date} className="relative">
                                    <div className="flex items-center gap-4 mb-8">
                                        <h3 className="text-xl font-black whitespace-nowrap">{date}</h3>
                                        <div className="h-[2px] w-full bg-slate-200/50 rounded-full" />
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        {/* Completed Division */}
                                        <div className="bg-emerald-50/40 p-6 rounded-[2.5rem] border border-emerald-100/30 space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-xs uppercase tracking-widest text-emerald-700/80">Completed Doses ({groups.taken.length})</span>
                                            </div>
                                            <div className="space-y-4">
                                                {groups.taken.map((log: any, idx: number) => (
                                                    <div key={`history-taken-${log.id || idx}-${idx}`} className="group flex items-center justify-between p-5 bg-white/80 border border-emerald-100/50 rounded-2xl transition-all shadow-sm hover:shadow-md cursor-default backdrop-blur-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                            <div>
                                                                <h4 className="font-black text-lg leading-tight text-slate-800">{log.medicine_name}</h4>
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" /> {new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleDeleteHistory(log.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {groups.taken.length === 0 && (
                                                    <div className="p-8 text-center text-emerald-600/50 text-xs font-bold uppercase tracking-widest bg-emerald-100/20 rounded-2xl border border-dashed border-emerald-200/50">
                                                        No doses recorded
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Missed Division */}
                                        <div className="bg-rose-50/40 dark:bg-rose-900/10 p-6 rounded-[2.5rem] border border-rose-100/30 dark:border-rose-900/30 space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
                                                    <AlertTriangle className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-xs uppercase tracking-widest text-rose-700/80">Missed Doses ({groups.missed.length})</span>
                                            </div>
                                            <div className="space-y-4">
                                                {groups.missed.map((log: any, idx: number) => (
                                                    <div key={`history-missed-${log.id || idx}-${idx}`} className="group flex items-center justify-between p-5 bg-white/80 border border-rose-100/50 rounded-2xl transition-all shadow-sm hover:shadow-md cursor-default backdrop-blur-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                                                            <div>
                                                                <h4 className="font-black text-lg leading-tight text-slate-800">{log.medicine_name}</h4>
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" /> {new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleDeleteHistory(log.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {groups.missed.length === 0 && (
                                                    <div className="p-8 text-center text-rose-600/50 text-xs font-bold uppercase tracking-widest bg-rose-100/20 rounded-2xl border border-dashed border-rose-200/50">
                                                        No missed records
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-blue-200/50 dark:bg-slate-800/50 text-center py-20 rounded-[3rem] border-2 border-dashed border-blue-300 dark:border-slate-700">
                            <History className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
                            <p className="text-slate-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs">No Adherence Records Found</p>
                        </div>
                    )
                    }
                </motion.div >
            </AnimatePresence >
        </div >
    );
};
