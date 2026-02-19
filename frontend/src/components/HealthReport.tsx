import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Star, Calendar, Droplet, Heart } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface HealthReportProps {
    userId: number;
    currentVitals?: any;
    language?: string;
    facialAnalysisData?: any;
}

const HealthReport: React.FC<HealthReportProps> = ({ userId, currentVitals, language = 'en', facialAnalysisData }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/vitals/history?user_id=${userId}&limit=7`);
                const data = await response.json();
                if (data.history) {
                    setHistory(data.history.reverse()); // Show oldest to newest
                }
            } catch (error) {
                console.error("Failed to fetch vitals history:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchHistory();
        }
    }, [userId, currentVitals]);

    const [analysis, setAnalysis] = useState<string>("Your vitals are being monitored.");
    const [recommendations, setRecommendations] = useState<string[]>([]);

    useEffect(() => {
        const fetchAnalysis = async () => {
            if (!currentVitals) return;
            try {
                const response = await fetch(`${API_BASE_URL}/health/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...currentVitals, language, facial_scan: facialAnalysisData })
                });
                const data = await response.json();
                setAnalysis(data.analysis);
                setRecommendations(data.recommendations);
            } catch (error) {
                console.error("Health analysis failed:", error);
            }
        };

        if (currentVitals) {
            fetchAnalysis();
        }
    }, [currentVitals, language]);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-sapphire-600 to-emerald-600 health-report-gradient p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold uppercase tracking-widest text-emerald-100">AI Analysis</span>
                    </div>
                    <h2 className="text-3xl font-black mb-4">Weekly Health Report</h2>
                    <p className="text-lg text-emerald-50 leading-relaxed mb-6">
                        "{analysis}"
                    </p>
                    <div className="flex gap-4">
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl">
                            <p className="text-[10px] uppercase font-bold opacity-60">Current BP</p>
                            <p className="text-lg font-bold">{currentVitals?.bp?.systolic ?? '--'}/{currentVitals?.bp?.diastolic ?? '--'}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl">
                            <p className="text-[10px] uppercase font-bold opacity-60">Sugar</p>
                            <p className="text-lg font-bold">{currentVitals?.sugar?.level ?? '--'}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl">
                            <p className="text-[10px] uppercase font-bold opacity-60">Heart Rate</p>
                            <p className="text-lg font-bold">{currentVitals?.heart_rate?.bpm?.bpm ?? currentVitals?.heart_rate?.bpm ?? currentVitals?.heart_rate ?? '--'}</p>
                        </div>
                    </div>
                </div>
                <TrendingUp className="absolute bottom-[-20px] right-[-20px] w-64 h-64 text-white opacity-10 rotate-12" />
            </div>

            {/* Facial Analysis Visuals */}
            {facialAnalysisData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-500/30">
                        <p className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-300 opacity-70">Stress Level</p>
                        <p className="text-xl font-black text-purple-700 dark:text-white mt-1">
                            {facialAnalysisData.detections?.stress?.level || 'Unknown'}
                        </p>
                    </div>
                    <div className="glass-card p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-500/30">
                        <p className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-300 opacity-70">Fatigue</p>
                        <p className="text-xl font-black text-orange-700 dark:text-white mt-1">
                            {facialAnalysisData.detections?.fatigue?.level || 'Unknown'}
                        </p>
                    </div>
                    <div className="glass-card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-500/30">
                        <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-300 opacity-70">Est. BP</p>
                        <p className="text-xl font-black text-blue-700 dark:text-white mt-1">
                            {facialAnalysisData.vitals_estimated?.bp_systolic}/{facialAnalysisData.vitals_estimated?.bp_diastolic}
                        </p>
                    </div>
                    <div className="glass-card p-4 bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-500/30">
                        <p className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-300 opacity-70">Est. HR</p>
                        <p className="text-xl font-black text-teal-700 dark:text-white mt-1">
                            {facialAnalysisData.vitals_estimated?.heart_rate} bpm
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-red-500" />
                        BP Trends
                    </h4>
                    <div className="h-32 flex items-end justify-between gap-1">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">Loading...</div>
                        ) : history.length > 0 ? (
                            history.map((record, i) => {
                                const height = Math.min(100, Math.max(10, ((record.bp_systolic - 90) / 70) * 100));
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: `${height}%`, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                        className="w-full bg-gradient-to-t from-red-100 to-red-400 trend-bar-red rounded-t-lg relative group hover:from-red-200 hover:to-red-500 transition-all shadow-sm"
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded-md shadow-lg transform scale-90 group-hover:scale-100 transition-all whitespace-nowrap z-10">
                                            {record.bp_systolic} mmHg
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">--</div>
                        )}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-amber-500" />
                        Sugar Trends
                    </h4>
                    <div className="h-32 flex items-end justify-between gap-1">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">Loading...</div>
                        ) : history.length > 0 ? (
                            history.map((record, i) => {
                                const height = Math.min(100, Math.max(10, ((record.sugar_level - 70) / 130) * 100));
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: `${height}%`, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                        className="w-full bg-gradient-to-t from-amber-100 to-amber-400 trend-bar-amber rounded-t-lg relative group hover:from-amber-200 hover:to-amber-500 transition-all shadow-sm"
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded-md shadow-lg transform scale-90 group-hover:scale-100 transition-all whitespace-nowrap z-10">
                                            {record.sugar_level} mg/dL
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">--</div>
                        )}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-emerald-500" />
                        Heart Trends
                    </h4>
                    <div className="h-32 flex items-end justify-between gap-1">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">Loading...</div>
                        ) : history.length > 0 ? (
                            history.map((record, i) => {
                                const height = Math.min(100, Math.max(10, ((record.heart_rate - 50) / 70) * 100));
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: `${height}%`, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                        className="w-full bg-gradient-to-t from-emerald-100 to-emerald-400 trend-bar-emerald rounded-t-lg relative group hover:from-emerald-200 hover:to-emerald-500 transition-all shadow-sm"
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded-md shadow-lg transform scale-90 group-hover:scale-100 transition-all whitespace-nowrap z-10">
                                            {record.heart_rate} bpm
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">--</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-6">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-sapphire-500" />
                        Upcoming Targets
                    </h4>
                    <div className="space-y-3">
                        {(recommendations?.length || 0) > 0 ? recommendations.map((rec, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-sm font-medium">{rec}</p>
                            </div>
                        )) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <p className="text-sm font-medium">Daily Walk (30 mins)</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-sapphire-500" />
                                    <p className="text-sm font-medium">BP Check (7:00 AM)</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HealthReport;
