import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Droplet, Activity, Calendar, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface VitalsRecord {
    bp_systolic: number;
    bp_diastolic: number;
    sugar_level: number;
    heart_rate: number;
    notes: string;
    recorded_at: string;
}

interface VitalsMonitorProps {
    userId: number;
    onEdit?: (record: any) => void;
    onDelete?: (id: number) => void;
    updateTrigger?: number;
}

const VitalsMonitor: React.FC<VitalsMonitorProps> = ({ userId, onEdit, onDelete, updateTrigger }) => {
    const [history, setHistory] = useState<VitalsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyDays, setHistoryDays] = useState(30);

    const fetchHistory = React.useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/vitals/history?user_id=${userId}&days=${historyDays}`);
            const data = await response.json();
            if (data.history) {
                setHistory(data.history);
            }
        } catch (error) {
            console.error("Failed to fetch vitals history:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, historyDays]);

    useEffect(() => {
        if (userId) fetchHistory();
    }, [userId, fetchHistory, updateTrigger]);

    const exportToJSON = () => {
        const dataStr = JSON.stringify(history, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `vitals_history_${new Date().toISOString()}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const exportToCSV = () => {
        const headers = ["Date", "Systolic", "Diastolic", "Sugar Level", "Heart Rate", "Notes"];
        const rows = history.map(h => [
            new Date(h.recorded_at).toLocaleString(),
            h.bp_systolic,
            h.bp_diastolic,
            h.sugar_level,
            h.heart_rate,
            h.notes
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vitals_history_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        // Using a basic XML format that Excel can open as a native spreadsheet
        const headers = ["Date", "Systolic", "Diastolic", "Sugar Level", "Heart Rate", "Notes"];
        const rows = history.map(h => `
            <Row>
                <Cell><Data ss:Type="String">${new Date(h.recorded_at).toLocaleString()}</Data></Cell>
                <Cell><Data ss:Type="Number">${h.bp_systolic}</Data></Cell>
                <Cell><Data ss:Type="Number">${h.bp_diastolic}</Data></Cell>
                <Cell><Data ss:Type="Number">${h.sugar_level}</Data></Cell>
                <Cell><Data ss:Type="Number">${h.heart_rate}</Data></Cell>
                <Cell><Data ss:Type="String">${h.notes || ''}</Data></Cell>
            </Row>`).join('');

        const xml = `
            <?xml version="1.0"?>
            <?mso-application progid="Excel.Sheet"?>
            <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
             xmlns:o="urn:schemas-microsoft-com:office:office"
             xmlns:x="urn:schemas-microsoft-com:office:excel"
             xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
             xmlns:html="http://www.w3.org/TR/REC-html40">
             <Worksheet ss:Name="Vitals History">
              <Table>
                <Row>
                   ${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}
                </Row>
                ${rows}
              </Table>
             </Worksheet>
            </Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vitals_history_${new Date().toISOString()}.xls`;
        link.click();
    };

    const getTrendIcon = (current: number, previous: number) => {
        if (!previous) return <Minus className="w-4 h-4 text-slate-400" />;
        if (current > previous) return <TrendingUp className="w-4 h-4 text-red-500" />;
        if (current < previous) return <TrendingDown className="w-4 h-4 text-emerald-500" />;
        return <Minus className="w-4 h-4 text-slate-400" />;
    };

    // Enhanced health status functions for color-coded indicators
    const getBPStatus = (systolic: number, diastolic: number) => {
        if (!systolic || !diastolic) return null;
        if (systolic >= 140 || diastolic >= 90) {
            return { status: 'high', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '⚠️' };
        } else if (systolic >= 120 || diastolic >= 80) {
            return { status: 'elevated', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚡' };
        } else {
            return { status: 'normal', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' };
        }
    };

    const getSugarStatus = (level: number) => {
        if (!level) return null;
        if (level >= 200) {
            return { status: 'high', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '⚠️' };
        } else if (level >= 140) {
            return { status: 'elevated', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚡' };
        } else if (level < 70) {
            return { status: 'low', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '💧' };
        } else {
            return { status: 'normal', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' };
        }
    };

    const getHeartRateStatus = (rate: number) => {
        if (!rate) return null;
        if (rate >= 100) {
            return { status: 'high', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '⚠️' };
        } else if (rate >= 90) {
            return { status: 'elevated', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚡' };
        } else if (rate < 60) {
            return { status: 'low', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '💧' };
        } else {
            return { status: 'normal', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' };
        }
    };

    const Sparkline = ({ data, color }: { data: number[], color: string }) => {
        if (data.length < 2) return null;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const width = 100;
        const height = 30;
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d - min) / range) * height;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg width={width} height={height} className="overflow-visible">
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <div className="w-12 h-12 border-4 border-sapphire-500/30 border-t-sapphire-500 rounded-full animate-spin" />
            </div>
        );
    }

    const latest = history[0];
    const previous = history[1];

    // Get status for each vital type
    const bpStatus = latest ? getBPStatus(latest.bp_systolic, latest.bp_diastolic) : null;
    const sugarStatus = latest ? getSugarStatus(latest.sugar_level) : null;
    const heartRateStatus = latest ? getHeartRateStatus(latest.heart_rate) : null;

    return (
        <div className="space-y-8 pb-12">
            {/* Header / Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        label: 'Blood Pressure',
                        value: latest ? `${latest.bp_systolic}/${latest.bp_diastolic}` : '--',
                        icon: Heart,
                        color: bpStatus?.color || 'text-gray-600',
                        bg: bpStatus?.bg || 'bg-gray-50',
                        border: bpStatus?.border || 'border-gray-200',
                        status: bpStatus?.status,
                        statusIcon: bpStatus?.icon,
                        data: history.map(h => h.bp_systolic).reverse(),
                        tint: 'rgba(239, 68, 68, 0.1)'
                    },
                    {
                        label: 'Sugar Level',
                        value: latest ? latest.sugar_level : '--',
                        icon: Droplet,
                        color: sugarStatus?.color || 'text-gray-600',
                        bg: sugarStatus?.bg || 'bg-gray-50',
                        border: sugarStatus?.border || 'border-gray-200',
                        status: sugarStatus?.status,
                        statusIcon: sugarStatus?.icon,
                        data: history.map(h => h.sugar_level).reverse(),
                        tint: 'rgba(245, 158, 11, 0.1)'
                    },
                    {
                        label: 'Heart Rate',
                        value: latest ? latest.heart_rate : '--',
                        icon: Activity,
                        color: heartRateStatus?.color || 'text-gray-600',
                        bg: heartRateStatus?.bg || 'bg-gray-50',
                        border: heartRateStatus?.border || 'border-gray-200',
                        status: heartRateStatus?.status,
                        statusIcon: heartRateStatus?.icon,
                        data: history.map(h => h.heart_rate).reverse(),
                        tint: 'rgba(16, 185, 129, 0.1)'
                    }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-6 relative overflow-hidden magic-tile"
                        style={{ borderLeft: `4px solid ${stat.color.replace('text-', '#').replace('500', '600')}` }}
                    >
                        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundColor: stat.tint }} />
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                    <div className={`p-3 ${stat.bg} rounded-2xl shadow-sm border-2 ${stat.border}/50 dark:border-slate-700/50`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit?.(latest || {}); }}
                                        className="p-3 bg-white/40 hover:bg-white/60 dark:bg-slate-700/40 dark:hover:bg-slate-700/60 backdrop-blur-md rounded-2xl transition-all shadow-sm border border-white/40 dark:border-slate-600/30 group/btn flex items-center gap-2"
                                        title="Quick Log"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Log</span>
                                    </button>
                                </div>
                                <Sparkline data={stat.data} color={stat.color.replace('text-', '#').replace('500', '600')} />
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-300 uppercase tracking-widest vitals-monitor-text">{stat.label}</h4>
                                {stat.status && (
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${stat.bg} ${stat.border} ${stat.color} flex items-center gap-1`}>
                                        <span>{stat.statusIcon}</span>
                                        <span className="uppercase tracking-widest">{stat.status}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-3xl font-bold text-gray-900 dark:text-white vitals-monitor-text">{stat.value}</p>
                                {latest && previous && getTrendIcon(
                                    stat.label === 'Blood Pressure' ? latest.bp_systolic : (stat.label === 'Sugar Level' ? latest.sugar_level : latest.heart_rate),
                                    stat.label === 'Blood Pressure' ? previous.bp_systolic : (stat.label === 'Sugar Level' ? previous.sugar_level : previous.heart_rate)
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* History Table */}
            <div className="glass-card overflow-hidden magic-tile bg-white/50 dark:bg-slate-900/50">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/20">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-3 vitals-monitor-text">
                                <Calendar className="w-6 h-6 text-sapphire-600" />
                                Health Records
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] pl-9">
                                {history.length} records in last {historyDays} days
                            </p>
                        </div>

                        {/* Range Toggle & Export Actions */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Toggle Range */}
                            <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner">
                                <button
                                    onClick={() => setHistoryDays(7)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${historyDays === 7 ? 'bg-white dark:bg-slate-700 !text-red-600 dark:!text-red-400 shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Last 7 Days
                                </button>
                                <button
                                    onClick={() => setHistoryDays(60)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${historyDays === 60 ? 'bg-white dark:bg-slate-700 !text-red-600 dark:!text-red-400 shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    60-Day History
                                </button>
                            </div>

                            {/* Export Buttons - Matching User's Image Styles */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={exportToJSON}
                                    className="magic-button rainbow-mesh px-4 py-2 rounded-xl bg-slate-900 vitals-monitor-text text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 border border-white/10"
                                >
                                    JSON
                                </button>
                                <button
                                    onClick={exportToCSV}
                                    className="magic-button rainbow-mesh px-4 py-2 rounded-xl bg-blue-600 vitals-monitor-text text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 border border-white/10"
                                >
                                    CSV
                                </button>
                                <button
                                    onClick={exportToExcel}
                                    className="magic-button rainbow-mesh px-4 py-2 rounded-xl bg-emerald-600 vitals-monitor-text text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 border border-white/10"
                                >
                                    Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-100/30 dark:bg-slate-800/30">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-900 dark:text-slate-400 uppercase tracking-widest vitals-monitor-text">Date & Time</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-900 dark:text-slate-400 uppercase tracking-widest vitals-monitor-text">BP (Sys/Dia)</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-900 dark:text-slate-400 uppercase tracking-widest vitals-monitor-text">Sugar</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-900 dark:text-slate-400 uppercase tracking-widest vitals-monitor-text">Heart Rate</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-900 dark:text-slate-400 uppercase tracking-widest vitals-monitor-text">Notes</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-900 dark:text-slate-400 uppercase tracking-widest vitals-monitor-text text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {history.map((record, i) => {
                                const recordBPStatus = getBPStatus(record.bp_systolic, record.bp_diastolic);
                                const recordSugarStatus = getSugarStatus(record.sugar_level);
                                const recordHeartRateStatus = getHeartRateStatus(record.heart_rate);

                                return (
                                    <motion.tr
                                        key={i}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900 dark:text-slate-200">{new Date(record.recorded_at).toLocaleDateString()}</p>
                                            <p className="text-[10px] font-bold text-gray-600 dark:text-slate-500">{new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {recordBPStatus ? (
                                                <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm border ${recordBPStatus.bg} ${recordBPStatus.border} ${recordBPStatus.color}`}>
                                                    {recordBPStatus.icon} {record.bp_systolic}/{record.bp_diastolic}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-bold">{record.bp_systolic}/{record.bp_diastolic}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold ${recordSugarStatus?.color || 'text-gray-900 dark:text-slate-200'}`}>{record.sugar_level}</span>
                                            <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 ml-1">mg/dL</span>
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${recordHeartRateStatus?.color || 'text-gray-900 dark:text-slate-200'}`}>{record.heart_rate} bpm</td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm italic text-gray-600 dark:text-slate-400 max-w-xs">{record.notes || 'No notes added'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onEdit?.(record)}
                                                    className="p-2 text-slate-400 hover:text-sapphire-600 hover:bg-sapphire-50 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <TrendingUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (onDelete) {
                                                            await onDelete?.((record as any).id);
                                                            fetchHistory();
                                                        }
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Activity className="w-4 h-4" strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {history.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold uppercase text-xs tracking-widest">No vitals history yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VitalsMonitor;
