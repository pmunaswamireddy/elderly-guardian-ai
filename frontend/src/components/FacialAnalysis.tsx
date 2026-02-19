import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, ShieldCheck, Activity, Heart, Droplet, Brain, Eye, CheckCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL } from '../config';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}


interface AnalysisResult {
    status: string;
    accuracy: number;
    detections: {
        fatigue: { level: string; confidence: number };
        jaundice: { detected: boolean; confidence: number };
        stress: { level: string; confidence: number };
        dehydration: { detected: boolean; confidence: number };
        anemia: { detected: boolean; confidence: number };
    };
    vitals_estimated: {
        heart_rate: number;
        blood_pressure: string;
        oxygen_saturation: number;
    };
    summary: string;
    recommendations: string[];
}

interface FacialAnalysisProps {
    onAnalysisComplete?: (data: any) => void;
}

const FacialAnalysis: React.FC<FacialAnalysisProps> = ({ onAnalysisComplete }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const analysisSteps = [
        "Initializing camera...",
        "Detecting facial landmarks...",
        "Analyzing skin tone...",
        "Checking eye conditions...",
        "Evaluating vital signs...",
        "Generating health report..."
    ];

    useEffect(() => {
        if (isAnalyzing) {
            const interval = setInterval(() => {
                setCurrentStep((prev) => (prev + 1) % analysisSteps.length);
            }, 500);
            return () => clearInterval(interval);
        }
    }, [isAnalyzing]);

    const startAnalysis = async () => {
        setIsAnalyzing(true);
        setCurrentStep(0);
        setResult(null);

        // Start camera stream
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
            }

            // Wait for camera to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Capture frame
            const canvas = document.createElement('canvas');
            if (videoRef.current) {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));

                if (blob) {
                    const formData = new FormData();
                    formData.append('file', blob, 'face.jpg');

                    const response = await fetch(`${API_BASE_URL}/analyze/face`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error('Analysis failed');

                    const data = await response.json();
                    if (!data.vitals_estimated) throw new Error('Invalid response format');
                    setResult(data);
                    if (onAnalysisComplete) {
                        onAnalysisComplete(data);
                    }
                }
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            // alert('Could not access camera or analysis failed. Please ensure camera permissions are granted.');
        } finally {
            setIsAnalyzing(false);
            setIsStreaming(false);

            // Stop camera stream
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    };


    const getDetectionStatus = (detection: any) => {
        if (typeof detection === 'object' && detection.detected !== undefined) {
            return detection.detected ? 'warning' : 'good';
        }
        if (detection.level === 'Low' || detection.level === 'Minimal') return 'good';
        if (detection.level === 'Moderate') return 'warning';
        return 'critical';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-indigo-900/40 dark:to-cyan-900/40 rounded-2xl mb-4 border border-blue-100 dark:border-indigo-500/30"
                >
                    <Eye className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-2xl font-black text-blue-600 dark:text-white">Facial Health Analysis</h2>
                </motion.div>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Advanced AI-powered facial analysis for comprehensive health monitoring and early detection.
                </p>
            </div>

            {/* Main Analysis Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
            >
                {/* Header Bar */}
                <div className="p-6 bg-sapphire-50 dark:bg-slate-800/80 border-b border-sapphire-100 dark:border-slate-700/50 flex justify-between items-center">
                    <div className="flex justify-between items-center gap-4">
                        <h3 className="font-bold flex items-center gap-2 text-lg dark:text-white">
                            <Camera className="w-5 h-5 text-sapphire-600 dark:text-sapphire-400" />
                            Vision AI Scanner
                        </h3>
                        <AnimatePresence mode="wait">
                            {isAnalyzing ? (
                                <motion.span
                                    key="scanning"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs font-bold px-3 py-1 bg-white/20 rounded-full flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    SCANNING
                                </motion.span>
                            ) : result ? (
                                <motion.span
                                    key="complete"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs font-bold px-3 py-1 bg-emerald-500 rounded-full flex items-center gap-2"
                                >
                                    <CheckCircle className="w-3 h-3" />
                                    COMPLETE
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="ready"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs font-bold px-3 py-1 bg-white/20 rounded-full"
                                >
                                    READY
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Camera/Result Area */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn("absolute inset-0 w-full h-full object-cover", isStreaming ? "block" : "hidden")}
                    />

                    {!isStreaming && !result && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            {isAnalyzing ? (
                                <div className="text-center">
                                    <div className="relative mb-8">
                                        <div className="w-32 h-32 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        <motion.div
                                            animate={{ opacity: [0.2, 1, 0.2] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className="absolute inset-0 border-2 border-cyan-500 rounded-full"
                                        />
                                    </div>
                                    <motion.p
                                        key={currentStep}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-lg font-medium text-white shadow-sm"
                                    >
                                        {analysisSteps[currentStep]}
                                    </motion.p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Camera className="w-20 h-20 mb-4 opacity-30 text-indigo-400 mx-auto" />
                                    <p className="text-lg font-black text-white uppercase tracking-widest">Camera Ready</p>
                                    <p className="text-sm opacity-60 mt-2 text-slate-300">Click "Start Health Scan" to begin</p>
                                </div>
                            )}
                        </div>
                    )}

                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200 }}
                                    >
                                        <ShieldCheck className="w-24 h-24 text-emerald-500 mx-auto mb-4" />
                                    </motion.div>
                                    <p className="text-2xl font-bold text-emerald-600">{result.status}</p>
                                    <p className="text-sm text-gray-500 mt-1">{Math.round(result.accuracy * 100)}% Accuracy</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls/Results */}
                <div className="p-8">
                    {!result ? (
                        <button
                            disabled={isAnalyzing}
                            onClick={startAnalysis}
                            className="w-full btn-premium py-6 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <div className="flex items-center justify-center gap-3">
                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                    Analyzing...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-3">
                                    <Activity className="w-6 h-6" />
                                    Start Health Scan
                                </div>
                            )}
                        </button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Summary */}
                            <div className="p-4 bg-blue-50 dark:bg-indigo-900/30 rounded-xl border-l-4 border-l-blue-500 dark:border-l-indigo-500">
                                <p className="text-blue-700 dark:text-blue-200 leading-relaxed font-medium">{result.summary}</p>
                            </div>

                            {/* Vitals Estimated */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-transparent dark:border-slate-700/30 shadow-inner">
                                    <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{result.vitals_estimated?.heart_rate ?? '--'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-black tracking-widest">bpm</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-transparent dark:border-slate-700/30 shadow-inner">
                                    <Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{result.vitals_estimated?.blood_pressure ?? '--'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-black tracking-widest">mmHg</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-transparent dark:border-slate-700/30 shadow-inner">
                                    <Droplet className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{result.vitals_estimated?.oxygen_saturation ?? '--'}%</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-black tracking-widest">SpO2</p>
                                </div>
                            </div>

                            {/* Detections */}
                            <div>
                                <h4 className="font-black text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                    <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    Biometric Detections
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(result.detections).map(([key, detection], index) => (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-transparent dark:border-slate-700/30"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]", getDetectionStatus(detection) === 'good' ? 'bg-emerald-500' : getDetectionStatus(detection) === 'warning' ? 'bg-amber-500' : 'bg-red-500')} />
                                                <span className="font-medium text-gray-700 capitalize">
                                                    {key.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-gray-600">
                                                    {'detected' in (detection as any) ? ((detection as any).detected ? 'Detected' : 'Not Detected') : (detection as any).level}
                                                </span>
                                                <div className="text-xs text-gray-400">
                                                    {Math.round((detection as any).confidence * 100)}% confidence
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div>
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                    Recommendations
                                </h4>
                                <ul className="space-y-2">
                                    {result.recommendations.map((rec, index) => (
                                        <motion.li
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-start gap-3"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                                            <span className="text-gray-700">{rec}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setResult(null)}
                                    className="flex-1 btn-secondary-premium"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    New Scan
                                </button>
                                <button className="flex-1 btn-premium">
                                    Download Report
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default FacialAnalysis;
