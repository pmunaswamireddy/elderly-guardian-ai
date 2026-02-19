import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';
import { ArrowRight, Eye, EyeOff, Activity, Calendar, BarChart2, Pill, Camera, Heart, Shield, Users, LogOut, Sun, Moon, Settings, Bell, PhoneCall, BarChart3, Database, Monitor, MessageSquare, Info, X } from 'lucide-react';
import { API_BASE_URL } from './config';
import type { User, Medicine, VitalsRecord, Appointment, AnalysisResult } from './types';


// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useAppTheme';
import { useVitals } from './hooks/useVitals';
import { useSpeech } from './hooks/useSpeech';
import { useInactivity } from './hooks/useInactivity';
import { useAIEngine } from './ai/useAIEngine';

// Components
import PrescriptionUploader from './components/PrescriptionUploader';
import HealthReport from './components/HealthReport';
import VoiceBooking from './components/VoiceBooking';
import FacialAnalysis from './components/FacialAnalysis';
import DiseasePrediction from './components/DiseasePrediction';
import { SettingsModal } from './components/SettingsModal';
import { NotificationDropdown } from './components/NotificationDropdown';
import { ConfirmationModal } from './components/ConfirmationModal';
import VitalsMonitor from './components/VitalsMonitor';
import VitalsInput from './components/VitalsInput';
import { MedicineEntryModal } from './components/MedicineEntryModal';
import { MedicineList } from './components/MedicineList';
import { NetworkHelpModal } from './components/NetworkHelpModal';
import { MedicineReminderAlert } from './components/MedicineReminderAlert';
import { AIAgentVisualizer } from './components/AIAgentVisualizer';
import LocationTracker from './components/LocationTracker';
import AdminOverview from './components/admin/AdminOverview';
import UserManagement from './components/admin/UserManagement';
import CommunityChat from './components/CommunityChat';
import SystemMonitor from './components/admin/SystemMonitor';
import DatabaseManager from './components/admin/DatabaseManager';
import { InfoModal } from './components/InfoModal';
import { ChatHistoryModal } from './components/ChatHistoryModal';
import type { ChatMessage } from './components/ChatHistoryModal';
import { History } from 'lucide-react';

const App: React.FC = () => {
    // --- Hooks ---
    const { user, isLoggedIn, loading, login, signup, logout, updateUserSettings } = useAuth();
    // --- UI State ---
    const [activeTab, setActiveTab] = useState<'home' | 'meds' | 'docs' | 'stats' | 'face' | 'predict' | 'admin' | 'chat'>('home');
    const [settingsInitialSection, setSettingsInitialSection] = useState<'profile' | 'preferences'>('profile');
    const [adminSubTab, setAdminSubTab] = useState<'overview' | 'content' | 'media' | 'users' | 'settings' | 'logs' | 'monitor' | 'database'>('overview');
    const [showSettings, setShowSettings] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showVitalsForm, setShowVitalsForm] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showNetworkHelp, setShowNetworkHelp] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [editingVitals, setEditingVitals] = useState<VitalsRecord | null>(null);
    const [editingMed, setEditingMed] = useState<Medicine | null>(null);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);
    const [pendingSettingsAction, setPendingSettingsAction] = useState<{ section: 'profile' | 'preferences' } | null>(null);
    const [showMedModal, setShowMedModal] = useState(false);
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', phone: '' });
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' } | null>(null);
    const [activeAlertMed, setActiveAlertMed] = useState<Medicine | null>(null);
    const [facialAnalysisData, setFacialAnalysisData] = useState<AnalysisResult | null>(null);
    const [vitalsUpdateCount, setVitalsUpdateCount] = useState(0);
    const [isSimpleMode] = useState(true);
    const [sosProgress, setSosProgress] = useState(0);
    const [sosActive, setSosActive] = useState(false);
    const userRef = useRef<User | null>(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useTheme(user?.theme, user?.font_size_scale, user?.high_contrast);

    const vitalsData = useVitals(user?.id);
    const aiEngine = useAIEngine(user);

    const handleOpenSettings = useCallback((initialTab: 'profile' | 'preferences' = 'profile') => {
        if (userRef.current?.guardian_pin) {
            setPendingSettingsAction({ section: initialTab });
            setShowPinModal(true);
        } else {
            setSettingsInitialSection(initialTab);
            setShowSettings(true);
        }
    }, []);

    const speechRef = useRef<ReturnType<typeof useSpeech> | null>(null);

    const speech = useSpeech(
        async (text, isManual) => {
            // --- Always On Mode: Wake Word Check ---
            // Unless manually triggered, we only respond to "Hey Guardian" or "Hey G"
            if (userRef.current?.ai_always_active && !isManual) {
                // Broadened regex for multilingual wake-words, avoids \b for unicode compatibility
                // Added "KG" (కేజీ) variation for phonetic Telugu confusion
                const wakeWordRegex = new RegExp(
                    // English
                    '^(hey|hay|hi|hello|ok)\\s+(guardian|g|gee|ji)($|[\\s\\.,!\\?])|' +
                    // Hindi
                    '^(हे|नमस्ते|हेलो)\\s+(गार्जियन|रक्षक)($|[\\s\\.,!\\?])|' +
                    // Telugu: Added కేజీ (Phonetic "KG")
                    '^(హే|నమస్కారం|కేజీ)\\s+(గార్డియన్|రక్షకుడు|జి|గే)($|[\\s\\.,!\\?])|' +
                    // Tamil
                    '^(ஹே|வணக்கம்)\\s+(கார்டியన్|பாதுகாவலரே)($|[\\s\\.,!\\?])|' +
                    // Bengali
                    '^(হে|নমস্কার)\\s+(গার্ডিয়ান|অভিভাবক)($|[\\s\\.,!\\?])|' +
                    // Marathi
                    '^(হে|नमस्कार)\\s+(गार्डियन|रक्षक)($|[\\s\\.,!\\?])|' +
                    // Gujarati
                    '^(હે|નમસ્તે)\\s+(ગાર્ડીયન|રક્ષક)($|[\\s\\.,!\\?])|' +
                    // Kannada
                    '^(ಹೇ|ನಮಸ್ತೆ)\\s+(ಗಾರ್ಡಿಯನ್|రక్షకుడు)($|[\\s\\.,!\\?])|' +
                    // Malayalam
                    '^(హే|నమస్కారం)\\s+(గార్డియన్|రక్షకుడు)($|[\\s\\.,!\\?])|' +
                    // Punjabi
                    '^(ਹੇ|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ)\\s+(ਗਾਰਡੀਅਨ|ਰੱਖਿਅਕ)($|[\\s\\.,!\\?])|' +
                    // Urdu
                    '^(ہیلو|سلام)\\s+(گارڈین|محافظ)($|[\\s\\.,!\\?])|' +
                    // Odia
                    '^(ହେ|ନମସ୍କାର)\\s+(ଗାର୍ଡିଆନ୍‌|ରକ୍ଷକ)($|[\\s\\.,!\\?])',
                    'i');
                if (!wakeWordRegex.test(text)) {
                    console.log(`[AlwaysOn] Ignored '${text}' (No Wake Word)`);
                    return;
                }
            }
            // --- Magic Words Check ---
            if (user?.magic_words_mappings) {
                const lowerText = text.toLowerCase().trim().replace(/[.,!]/g, '');
                for (const [trigger, action] of Object.entries(user.magic_words_mappings)) {
                    if (lowerText === trigger.toLowerCase()) {
                        console.log(`[Magic Word] Triggered: ${trigger} -> ${action}`);

                        // Execute Magic Action
                        if (action === 'silent_sos') {
                            if (user.emergency_contact_phone) {
                                window.location.href = `tel:${user.emergency_contact_phone}`;
                            }
                            return; // Stop AI processing
                        }
                        if (action === 'goodnight_protocol') {
                            updateUserSettings({ theme: 'dark', quiet_hours_enabled: true });
                            if (speechRef.current) speechRef.current.speak("Goodnight Protocol Initiated. Sleep well.", user.preferred_language || 'en');
                            return;
                        }
                        if (action === 'morning_protocol') {
                            updateUserSettings({ theme: 'light', quiet_hours_enabled: false });
                            if (speechRef.current) speechRef.current.speak("Good Morning Protocol Initiated. Have a great day.", user.preferred_language || 'en');
                            return;
                        }
                    }
                }
            }

            if (speechRef.current) {
                speechRef.current.stopListening(); // Stop mic immediately to prevent noise during processing
                speechRef.current.setIsProcessing(true);
            }

            // Log User Message
            setChatHistory(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);

            const data = await aiEngine.handleChat(text);
            if (data) {
                speechRef.current?.setAiResponse(data.response_text);

                // Log AI Message
                setChatHistory(prev => [...prev, { role: 'assistant', text: data.response_text, timestamp: Date.now() }]);

                // Continuity Fix: Trigger speak BEFORE clearing processing state
                // Use userRef to ensure we have the absolute latest language setting
                const lang = userRef.current?.ai_language || userRef.current?.preferred_language || 'en';
                if (speechRef.current) {
                    speechRef.current.speak(data.response_text, lang);
                    speechRef.current.setIsProcessing(false);
                }

                // Handle direct state navigation if AI intent matches
                if (data.intent === 'navigate' || data.intent === 'ui_navigate') {
                    const target = data.parameters?.target || data.parameters?.page;
                    if (['home', 'meds', 'chat', 'stats', 'docs', 'face', 'predict', 'admin'].includes(target)) {
                        // Security Check for Admin
                        if (target === 'admin' && user?.role !== 'admin') {
                            if (speechRef.current) speechRef.current.speak("I'm sorry, access to the admin panel is restricted.", user?.ai_language || 'en');
                            return;
                        }
                        setActiveTab(target as 'home' | 'meds' | 'docs' | 'stats' | 'face' | 'predict' | 'admin' | 'chat');
                    }
                }
            }
        },
        user?.ai_language || user?.preferred_language || 'en', // speechLang (AI/Voice)
        user?.preferred_language || 'en',                     // uiLang (App Text)
        user,
        activeTab === 'docs' || activeTab === 'chat'           // isDisabled
    );
    speechRef.current = speech;

    const handleInactivityTimeout = useCallback(() => {
        if (user?.emergency_contact_phone) {
            speech.speak("Inactivity detected. Calling emergency contact.", user?.preferred_language || 'en');
            window.location.href = `tel:${user.emergency_contact_phone}`;
        }
    }, [user?.emergency_contact_phone, user?.preferred_language, speech]);

    // Inactivity Monitor - Auto SOS
    useInactivity(
        user?.inactivity_check_enabled,
        user?.inactivity_timeout_hours || 6,
        handleInactivityTimeout
    );

    // --- Voice Command Listener (Global) ---
    useEffect(() => {
        const handleVoiceCommand = (e: CustomEvent) => {
            const { type, key, value, feature, state, action, target } = e.detail;
            console.log("[App] Voice Command Received:", e.detail);

            if (type === 'setting') {
                if (key === 'theme') updateUserSettings({ theme: value.includes('dark') ? 'dark' : 'light' });
                if (key === 'font_size') updateUserSettings({ font_size_scale: value === 'large' ? 1.2 : 1.0 });
                if (key === 'language') updateUserSettings({ preferred_language: value });
            }
            if (type === 'toggle') {
                if (feature === 'voice') updateUserSettings({ voice_enabled: state });
                if (feature === 'reminders') updateUserSettings({ voice_reminders_enabled: state });
                if (feature === 'ai_always_active') updateUserSettings({ ai_always_active: state });
            }
            if (type === 'action') {
                if (action === 'open_settings') {
                    const targetSection = (target && ['voice', 'audio', 'sound', 'preferences', 'language', 'theme', 'app'].some(k => target.includes(k))) ? 'preferences' : 'profile';
                    handleOpenSettings(targetSection);
                }
                if (action === 'close_settings') setShowSettings(false);
                if (action === 'open_vitals') setShowVitalsForm(true);
                if (action === 'open_meds') setShowMedModal(true);
                if (action === 'show_info') setShowInfo(true);
            }
        };

        window.addEventListener('voice-command', handleVoiceCommand as EventListener);
        return () => window.removeEventListener('voice-command', handleVoiceCommand as EventListener);
    }, [updateUserSettings, handleOpenSettings]);

    // --- SOS Hold Logic ---
    const sosRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const startSosHold = () => {
        // e.preventDefault(); // Prevent default touch actions (scrolling) if needed
        setSosActive(true);
        startTimeRef.current = Date.now();
        const duration = (user?.emergency_hold_duration || 3) * 1000;

        // Instant call if duration is 0
        if (duration <= 0) {
            window.location.href = `tel:${user?.emergency_contact_phone || ''}`;
            setSosActive(false);
            return;
        }

        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const progress = Math.min((elapsed / duration) * 100, 100);
            setSosProgress(progress);

            if (progress >= 100) {
                // Trigger Call
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                window.location.href = `tel:${user?.emergency_contact_phone || ''}`;
                setSosActive(false);
                setSosProgress(0);
            } else {
                sosRef.current = requestAnimationFrame(animate);
            }
        };
        sosRef.current = requestAnimationFrame(animate);
    };

    const endSosHold = () => {
        setSosActive(false);
        setSosProgress(0);
        if (sosRef.current) cancelAnimationFrame(sosRef.current);
    };

    // Sync AI Always Active setting
    useEffect(() => {
        if (user?.ai_always_active !== undefined) {
            speech.setContinuous(user.ai_always_active);
        }
    }, [user?.ai_always_active, speech]);

    // --- Reminder Logic ---
    // User global set instead of ref

    const checkReminders = useCallback(() => {
        const isQuietHours = () => {
            if (!user?.quiet_hours_enabled || !user.quiet_hours_start || !user.quiet_hours_end) return false;
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();

            const [sH, sM] = user.quiet_hours_start.split(':').map(Number);
            const [eH, eM] = user.quiet_hours_end.split(':').map(Number);
            const startMins = sH * 60 + sM;
            const endMins = eH * 60 + eM;

            if (startMins < endMins) {
                return currentMins >= startMins && currentMins < endMins;
            } else {
                return currentMins >= startMins || currentMins < endMins;
            }
        };

        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const [nowH, nowM] = currentTimeStr.split(':').map(Number);
        const todayStr = now.toDateString();

        try {
            // Medicine Reminders
            if (vitalsData.medicines) {
                vitalsData.medicines.forEach(med => {
                    if (med.taken || !med.time) return;

                    const timeParts = med.time.split(':');
                    if (timeParts.length < 2) return;

                    const [medH, medM] = timeParts.map(Number);
                    const diffMinutes = (nowH * 60 + nowM) - (medH * 60 + medM);
                    const reminderKey = `${user?.id || 'guest'}_${todayStr}_${med.id}_${diffMinutes}`;

                    if (globalProcessedReminders.has(reminderKey)) {
                        // Check if we need to AUTO-CLOSE the popup after 10 minutes
                        if (activeAlertMed && activeAlertMed.id === med.id && diffMinutes > 10) {
                            console.log(`[Reminders] Auto-closing popup for ${med.name} (timeout > 10m)`);
                            setActiveAlertMed(null);
                        }
                        return;
                    }

                    // Pre-alerts (-5 ... -1) -> Voice ONLY
                    // Exact (0) -> Voice + Popup
                    // Late (1...9) -> Voice + Popup (if not seen)
                    const alertOffsets = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

                    if (alertOffsets.includes(diffMinutes)) {
                        globalProcessedReminders.add(reminderKey);

                        // POPUP LOGIC: Only show if exact time or late (>= 0)
                        if (diffMinutes >= 0) {
                            setActiveAlertMed(med);
                        }

                        console.log(`[Reminders] Triggering alert for ${med.name} at T${diffMinutes >= 0 ? '+' : ''}${diffMinutes}m`);

                        let speechText = '';
                        const mealText = med.after_meal ? 'after meal' : 'before meal';

                        if (diffMinutes < 0) {
                            speechText = `Upcoming Medicine: ${med.name} in ${Math.abs(diffMinutes)} minutes, ${mealText}.`;
                        } else if (diffMinutes === 0) {
                            speechText = `Time to take ${med.name}, ${med.dosage}, ${mealText}.`;
                        } else {
                            speechText = `Reminder: Please take ${med.name} now.`;
                        }
                        if (user?.voice_reminders_enabled && !isQuietHours()) {
                            speech.speak(speechText, user?.preferred_language || 'en');
                        }
                    } else if (diffMinutes === 15 || diffMinutes === 30 || diffMinutes >= 60) {
                        // Periodic reminder every 15, 30, and 60 mins if missed (up to a limit handled by processed keys)
                        if ([15, 30, 60].includes(diffMinutes)) {
                            globalProcessedReminders.add(reminderKey);
                            if (user?.voice_reminders_enabled && !isQuietHours()) {
                                speech.speak(`You haven't taken ${med.name} yet. It is overdue.`, user?.preferred_language || 'en');
                            }
                        }
                    } else if (diffMinutes >= 120 && !globalProcessedReminders.has(`${user?.id || 'guest'}_${todayStr}_${med.id}_missed`)) {
                        // Mark as missed after 2 hours
                        if (activeAlertMed && activeAlertMed.id === med.id) setActiveAlertMed(null);
                        globalProcessedReminders.add(`${user?.id || 'guest'}_${todayStr}_${med.id}_missed`);
                        fetch(`${API_BASE_URL}/medicines/${med.id}/missed`, { method: 'POST' }).then(() => vitalsData.fetchMedicines());
                        if (user?.voice_reminders_enabled && !isQuietHours()) {
                            speech.speak(`You missed your dose of ${med.name}. Added to missed list.`, user?.preferred_language || 'en');
                        }
                    }
                });
            }

            // Appointment Reminders
            if (vitalsData.appointments) {
                vitalsData.appointments.forEach(appt => {
                    if (!appt.date || !appt.time) return;

                    try {
                        const apptDate = new Date(appt.date);
                        if (apptDate.toDateString() !== todayStr) return;

                        const timeParts = appt.time.split(':');
                        if (timeParts.length < 2) return;

                        const [apptH, apptM] = timeParts.map(Number);
                        const diffMinutes = (apptH * 60 + apptM) - (nowH * 60 + nowM); // Positive means future
                        const reminderKey = `appt_${todayStr}_${appt.id}_${diffMinutes}`;

                        if (globalProcessedReminders.has(reminderKey)) return;

                        // Remind: 1 hour (60), 30 mins, 15 mins, 5 mins, Now (0)
                        if ([60, 30, 15, 5, 0].includes(diffMinutes)) {
                            globalProcessedReminders.add(reminderKey);
                            let text = "";
                            if (diffMinutes === 0) text = `It is time for your appointment with ${appt.doctor_name}.`;
                            else text = `You have an appointment with ${appt.doctor_name} in ${diffMinutes} minutes.`;

                            console.log(`[Reminders] Speaking: ${text}`);
                            if (user?.voice_reminders_enabled && !isQuietHours()) {
                                speech.speak(text, user?.preferred_language || 'en');
                            }
                        }
                    } catch (e) { console.error("Error processing appointment:", e); }
                });
            }
        } catch (e) {
            console.error("Error in checkReminders:", e);
        }
    }, [user, vitalsData.medicines, vitalsData.appointments, activeAlertMed, speech, vitalsData.fetchMedicines]);

    useEffect(() => {
        if (isLoggedIn && !vitalsData.isInitialLoad) {
            const interval = setInterval(checkReminders, 30000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn, vitalsData.isInitialLoad, checkReminders]);

    useEffect(() => {
        if (user?.ai_always_active) {
            speech.setContinuous(true);
            speech.startListening();
        }
    }, [user?.ai_always_active, speech]);

    // --- Magical Layout Effects ---
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        if (isLoggedIn) return; // Don't track mouse if logged in (performance)

        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isLoggedIn]);

    const ParticleBackground = () => (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    initial={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight,
                        opacity: Math.random(),
                        scale: Math.random() * 0.5 + 0.5
                    }}
                    animate={{
                        y: [null, Math.random() * -100 - 50],
                        opacity: [0, 1, 0],
                        scale: [0, 1.2, 0]
                    }}
                    transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: Math.random() * 5
                    }}
                />
            ))}
        </div>
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    if (!isLoggedIn || !user) {
        return (
            <div className="h-screen flex flex-col md:flex-row bg-[#020617] overflow-hidden selection:bg-sapphire-500/30">
                {/* Left Side: Cyber Visual Branding */}
                <div className="hidden md:flex flex-1 p-0 flex-col justify-center items-center text-white relative overflow-hidden h-screen bg-[#020617]">
                    <ParticleBackground />

                    {/* Glowing Portal Visual */}
                    <div className="cyber-portal-ring scale-90 md:scale-100">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                            className="z-10"
                        >
                            <Shield className="w-16 h-16 md:w-20 md:h-20 text-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]" />
                        </motion.div>
                    </div>

                    <div className="z-10 mt-6 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tighter text-slate-50 premium-text-glow">
                                Welcome Back,<br />
                                <span className="magical-text italic glitter-text text-emerald-400 text-3xl md:text-4xl">Guardian.</span>
                            </h1>
                            <p className="text-slate-400 text-xs max-w-xs font-semibold leading-relaxed mx-auto italic opacity-70 mb-4 px-6">
                                "Thanks to this Elderly Guardian AI, I quickly found peace of mind! Easy to navigate and excellent results. Highly recommended!"
                            </p>
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-white/5 rounded-full border border-white/10 flex items-center justify-center mb-1 overflow-hidden">
                                    <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                                </div>
                                <span className="text-[10px] font-black text-white">Elderly Guardian</span>
                                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black">AI Protection System</span>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Side: Authentication Form */}
                <div className="flex-1 flex items-center justify-center p-0 bg-slate-950 relative overflow-hidden grid-dots-bg">
                    <motion.div
                        className="lens-flare"
                        animate={{ x: mousePos.x - window.innerWidth / 2 - 100, y: mousePos.y - 100 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    />

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full md:max-w-md space-y-2 p-6 md:p-8 flex flex-col justify-center auth-card-glass rounded-none md:rounded-l-[4rem] relative z-10 shadow-auth overflow-hidden"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={authMode}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    setAuthError('');
                                    setAuthSuccess('');
                                    const res = authMode === 'signin' ? await login(authForm.email, authForm.password) : await signup(authForm);
                                    if (!res.success) {
                                        setAuthError(res.error || 'Failed');
                                    } else if (authMode === 'signup') {
                                        setAuthMode('signin');
                                        setAuthSuccess('Account created! Please sign in.');
                                    }
                                }} className="space-y-4">
                                    <h2 className="text-3xl font-black text-white tracking-tight mb-8 mt-4 premium-text-glow">
                                        {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                                    </h2>

                                    <div className="space-y-4">
                                        {authMode === 'signup' && (
                                            <input
                                                type="text"
                                                placeholder="Full Name"
                                                className="w-full auth-input-refined"
                                                value={authForm.name}
                                                onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                                            />
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Email Address</label>
                                            <input
                                                type="email"
                                                placeholder="email@address.com"
                                                className="w-full auth-input-refined"
                                                value={authForm.email}
                                                onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Password</label>
                                            <div className="relative group">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter password"
                                                    className="w-full auth-input-refined pr-12"
                                                    value={authForm.password}
                                                    onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {authError && (
                                        <div className="text-red-400 text-xs font-bold text-center px-4 mt-2 bg-red-500/10 py-2 rounded-xl">
                                            {authError}
                                        </div>
                                    )}

                                    {authSuccess && (
                                        <div className="text-emerald-400 text-xs font-bold text-center px-4 mt-2 bg-emerald-500/10 py-2 rounded-xl">
                                            {authSuccess}
                                        </div>
                                    )}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        className="w-full py-5 text-sm text-white rounded-full font-black shadow-2xl flex items-center justify-center gap-3 mt-6 transition-all magic-button-premium premium-glow-border"
                                    >
                                        {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                                        <ArrowRight className="w-5 h-5" />
                                    </motion.button>
                                </form>

                                <div className="cyber-divider text-center my-6">Or {authMode === 'signin' ? 'sign in' : 'sign up'} with</div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button className="social-btn group">
                                        <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="G" />
                                        <span className="text-xs">Google</span>
                                    </button>
                                    <button className="social-btn group">
                                        <Users className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-all" />
                                        <span className="text-xs">LinkedIn</span>
                                    </button>
                                </div>

                                <motion.button
                                    whileHover={{ y: -2 }}
                                    onClick={() => {
                                        setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                                        setAuthError('');
                                        setAuthSuccess('');
                                    }}
                                    className="w-full text-center text-slate-400 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] transition-all py-6 mt-4 opacity-70 hover:opacity-100"
                                >
                                    {authMode === 'signin' ? "Don't have an account? Create now" : "Already a guardian? Sign In"}
                                </motion.button>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Debug Overlay */}
                <div className="fixed bottom-2 right-2 z-50 text-[10px] text-slate-600 bg-black/80 px-2 py-1 rounded opacity-50 hover:opacity-100 pointer-events-none">
                    API: {API_BASE_URL}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen transition-all duration-500 pb-24", user.theme === 'dark' ? "bg-[#020617] text-white" : "bg-slate-50 text-slate-900")}>
            <header className="p-6 flex justify-between items-center max-w-5xl mx-auto w-full sticky top-0 z-50 bg-transparent backdrop-blur-sm">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">EG</div>
                    <div><h2 className="text-xl font-black">{speech.t('hello')}, {user.name?.split(' ')[0] || 'Guardian'}</h2><p className="text-sm font-bold opacity-70">{speech.t('feeling_today')}</p></div>
                </div>
                <div className="flex gap-4 items-center">
                    {/* Centered Info Button */}
                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                        <button
                            onClick={() => setShowInfo(true)}
                            className="p-3 bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl hover:bg-white/40 dark:hover:bg-slate-700/50 shadow-lg rounded-full border border-white/20 dark:border-slate-700/50 transition-all group scale-110"
                            title="App Info"
                        >
                            <Info className="w-6 h-6 text-blue-500 dark:text-blue-400 group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={() => updateUserSettings({ theme: user.theme === 'dark' ? 'light' : 'dark' })}
                        className="p-3 bg-white/10 backdrop-blur-xl shadow-lg rounded-full border border-white/10 relative overflow-hidden group"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={user.theme === 'dark' ? 'dark' : 'light'}
                                initial={{ y: -20, opacity: 0, rotate: -45 }}
                                animate={{ y: 0, opacity: 1, rotate: 0 }}
                                exit={{ y: 20, opacity: 0, rotate: 45 }}
                                transition={{ duration: 0.2 }}
                            >
                                {user.theme === 'dark' ? <Moon className="w-6 h-6 text-indigo-300" /> : <Sun className="w-6 h-6 text-amber-500" />}
                            </motion.div>
                        </AnimatePresence>
                    </button>

                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className={cn("p-3 shadow-md rounded-full border transition-all hover:scale-110", user.theme === 'dark' ? "bg-slate-800 border-slate-700 text-sapphire-400" : "bg-white border-slate-100 text-sapphire-600")}
                        title="Conversation History"
                    >
                        <History className="w-6 h-6" />
                    </button>

                    <button onClick={() => handleOpenSettings('preferences')} className={cn("p-3 shadow-md rounded-full border", user.theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100")}><Settings className="w-6 h-6" /></button>
                    <button onClick={logout} className={cn("p-3 shadow-md rounded-full border text-red-500", user.theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100")}><LogOut className="w-6 h-6" /></button>
                    <button onClick={() => setShowNotifications(!showNotifications)} className={cn("p-3 shadow-md rounded-full border relative", user.theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100")}>
                        <Bell className="w-6 h-6" />
                        {((vitalsData.medicines?.filter(m => !m.taken)?.length || 0) + (vitalsData.appointments?.length || 0)) > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />}
                    </button>
                    <NotificationDropdown isOpen={showNotifications} onClose={() => setShowNotifications(false)} medicines={vitalsData.medicines} appointments={vitalsData.appointments as Appointment[]} vitalsCheckedToday={vitalsData.vitals.heart_rate.last_checked !== 'Never'} isSimpleMode={isSimpleMode} />
                </div>
            </header>

            <main className={cn("mx-auto pt-8 pb-40 space-y-12", activeTab === 'chat' ? "max-w-[95vw] px-4" : "max-w-5xl px-6")}>
                <AnimatePresence mode="wait">
                    {activeTab === 'home' && (
                        <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                            <AIAgentVisualizer
                                state={speech.isSpeaking ? 'speaking' : speech.isProcessing ? 'processing' : speech.isListening ? 'listening' : (user?.ai_always_active ? 'continuous' : 'idle')}
                                label={speech.aiResponse}
                                onClick={() => speech.startListening(true)}
                                onLogVitals={() => setShowVitalsForm(true)}
                                isMuted={speech.isMuted}
                                onToggleMute={speech.toggleMute}
                                onViewHistory={() => setShowHistoryModal(true)}
                                t={speech.t}
                                isAudioBlocked={speech.isAudioBlocked}
                            />
                            <HealthReport userId={user.id} currentVitals={vitalsData.vitals} facialAnalysisData={facialAnalysisData} />
                        </motion.div>
                    )}
                    {activeTab === 'meds' && (
                        <motion.div key="meds" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                            <div className="flex justify-between items-center"><h2 className="text-4xl font-black">{speech.t('nav_meds')}</h2><button onClick={() => { setEditingMed(null); setShowMedModal(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2"><Pill className="w-5 h-5" /> Add New Medicine</button></div>
                            <PrescriptionUploader userId={user.id} onSuccess={vitalsData.fetchMedicines} speak={speech.speak} />
                            <MedicineList userId={user.id} medicines={vitalsData.medicines} onDelete={(id) => setConfirmModal({ title: 'Delete Medicine?', message: 'Remove permanently?', onConfirm: async () => { await fetch(`${API_BASE_URL}/medicines/${id}`, { method: 'DELETE' }); vitalsData.fetchMedicines(); setConfirmModal(null); }, type: 'danger' })} onEdit={(m) => { setEditingMed(m); setShowMedModal(true); }} onMarkTaken={async (id) => { await fetch(`${API_BASE_URL}/medicines/${id}/taken`, { method: 'POST' }); vitalsData.fetchMedicines(); speech.speak("Marked as taken.", 'en'); }} />
                            <MedicineEntryModal
                                isOpen={showMedModal}
                                onClose={() => setShowMedModal(false)}
                                userId={user.id}
                                onSuccess={vitalsData.fetchMedicines}
                                speak={speech.speak}
                                initialData={editingMed}
                                strictMode={user.ai_medical_strict_mode}
                                onCheckInteractions={async (newMedName: string) => {
                                    if (!vitalsData.medicines || vitalsData.medicines.length === 0) return null;
                                    const currentMeds = vitalsData.medicines.map((m: Medicine) => m.name).join(', ');
                                    const prompt = `System Alert: User is adding NEW medicine: "${newMedName}". Current medicines: "${currentMeds}". Check for severe interactions. If Safe, reply exactly "SAFE". If Danger, reply "WARNING: [Short Reason]".`;

                                    // Use AI Engine directly (internal speech disabled for this check)
                                    speech.setIsProcessing(true);
                                    const result = await aiEngine.handleChat(prompt);
                                    speech.setIsProcessing(false);

                                    if (result?.response_text?.includes("WARNING")) {
                                        return result.response_text;
                                    }
                                    return null; // Safe
                                }}
                            />
                        </motion.div>
                    )}
                    {activeTab === 'chat' && <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}><CommunityChat currentUser={user} /></motion.div>}
                    {activeTab === 'docs' && <VoiceBooking userId={user.id} userSettings={user as User} onUpdateSettings={updateUserSettings} onSuccess={vitalsData.fetchAppointments} />}
                    {activeTab === 'predict' && <DiseasePrediction />}
                    {activeTab === 'face' && <FacialAnalysis onAnalysisComplete={(data: AnalysisResult) => setFacialAnalysisData(data)} />}
                    {activeTab === 'stats' && (
                        <VitalsMonitor
                            userId={user.id}
                            onEdit={(v: VitalsRecord) => { setEditingVitals(v); setShowVitalsForm(true); }}
                            onDelete={vitalsData.deleteVitals}
                            updateTrigger={vitalsUpdateCount}
                        />
                    )}
                    {activeTab === 'admin' && user?.role === 'admin' && (
                        <div className="space-y-8 flex flex-col lg:flex-row gap-8">
                            <div className="w-full lg:w-72 space-y-2">
                                {[
                                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                                    { id: 'users', label: 'User Center', icon: Users },
                                    { id: 'database', label: 'Database', icon: Database },
                                    { id: 'monitor', label: 'System Health', icon: Monitor },
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setAdminSubTab(tab.id as 'overview' | 'users' | 'database' | 'monitor')} className={cn("w-full flex flex-row items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all", adminSubTab === tab.id ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "text-slate-400 hover:bg-slate-100")}><tab.icon className="w-5 h-5 shrink-0" /> <span className="whitespace-nowrap">{tab.label}</span></button>
                                ))}
                            </div>
                            <div className="flex-1 min-h-[600px] animate-in fade-in slide-in-from-right-8 duration-500">
                                {adminSubTab === 'overview' && <AdminOverview />}
                                {adminSubTab === 'users' && <UserManagement />}
                                {adminSubTab === 'database' && <DatabaseManager />}
                                {adminSubTab === 'monitor' && <SystemMonitor />}
                            </div>
                        </div>
                    )}
                </AnimatePresence>
                <motion.button
                    onMouseDown={startSosHold}
                    onMouseUp={endSosHold}
                    onMouseLeave={endSosHold}
                    onTouchStart={startSosHold}
                    onTouchEnd={endSosHold}
                    className="w-full p-10 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-[3rem] shadow-2xl flex items-center justify-between group relative overflow-hidden select-none touch-none"
                    style={{ WebkitUserSelect: 'none' }} // Prevent text selection on hold
                >
                    {/* Progress Fill Overlay */}
                    <div
                        className="absolute inset-0 bg-white/30 transition-all duration-75 ease-linear pointer-events-none"
                        style={{ width: `${sosProgress}%` }}
                    />

                    <div className="text-left relative z-10">
                        <h3 className="text-2xl font-black uppercase opacity-90 mb-2">
                            {sosActive && sosProgress > 0 ? (sosProgress >= 100 ? 'CALLING...' : 'HOLD TO CALL...') : 'Emergency SOS'}
                        </h3>
                        <div className="flex flex-col">
                            <span className="opacity-80 font-bold text-xs uppercase tracking-widest">
                                {sosActive ? 'Keep Holding...' : `Call ${user.emergency_contact_name || 'Emergency Contact'}`}
                            </span>
                            <span className="text-4xl font-black tracking-tighter mt-1">{user.emergency_contact_phone || 'No Number'}</span>
                        </div>
                    </div>
                    {/* Circular Progress (Optional visual flair) or Icon */}
                    <div className="relative z-10 w-20 h-20 flex items-center justify-center">
                        {sosActive ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="transparent" />
                                    <circle cx="40" cy="40" r="36" stroke="white" strokeWidth="6" fill="transparent" strokeDasharray="226" strokeDashoffset={226 - (226 * sosProgress) / 100} strokeLinecap="round" />
                                </svg>
                                <PhoneCall className="w-10 h-10 absolute text-white animate-pulse" />
                            </div>
                        ) : (
                            <PhoneCall className="w-20 h-20 group-hover:rotate-12 transition-transform" />
                        )}
                    </div>
                </motion.button>
            </main>

            {/* Persistent AI Bubble - Visible on all pages except 'home' */}
            <AnimatePresence>
                {activeTab !== 'home' && activeTab !== 'docs' && activeTab !== 'chat' && (
                    <AIAgentVisualizer
                        floating
                        className="z-[1500]"
                        state={speech.isSpeaking ? 'speaking' : speech.isProcessing ? 'processing' : speech.isListening ? 'listening' : (user?.ai_always_active ? 'continuous' : 'idle')}
                        label={speech.aiResponse}
                        onClick={() => speech.startListening(true)}
                        isMuted={speech.isMuted}
                        onToggleMute={speech.toggleMute}
                        onViewHistory={() => setShowHistoryModal(true)}
                        t={speech.t}
                        isAudioBlocked={speech.isAudioBlocked}
                    />
                )}
            </AnimatePresence>

            <ChatHistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                history={chatHistory}
            />

            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-3xl rounded-[3rem] p-2 flex justify-around items-center z-[100] shadow-2xl bg-white/20 dark:bg-slate-800/20 backdrop-blur-3xl border border-white/10">
                {[
                    { icon: Activity, label: speech.t('nav_health'), id: 'home' },
                    { icon: Pill, label: speech.t('nav_meds'), id: 'meds' },
                    { icon: MessageSquare, label: speech.t('nav_chat'), id: 'chat' },
                    { icon: BarChart2, label: speech.t('nav_stats'), id: 'stats' },
                    { icon: Calendar, label: speech.t('nav_docs'), id: 'docs' },
                    { icon: Camera, label: speech.t('nav_face'), id: 'face' },
                ].map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as 'home' | 'meds' | 'docs' | 'stats' | 'face' | 'predict' | 'admin' | 'chat')} className={cn("flex flex-col items-center p-4 rounded-[2rem] transition-all", activeTab === item.id ? "bg-blue-600 text-white" : "text-slate-500")}>
                        <item.icon className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase mt-1">{item.label}</span>
                    </button>
                ))}
                {user.role === 'admin' && <button onClick={() => setActiveTab('admin')} className={cn("flex flex-col items-center p-4 rounded-[2rem] transition-all", activeTab === 'admin' ? "bg-blue-600 text-white" : "text-slate-500")}><Shield className="w-6 h-6" /><span className="text-[10px] font-black uppercase mt-1">Admin</span></button>}
            </nav>

            {/* Guardian PIN Modal */}
            <AnimatePresence>
                {showPinModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[3000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 text-center select-none"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
                        >
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black mb-2 dark:text-white">Guardian Lock</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Enter PIN to access settings</p>

                            <div className={`flex justify-center gap-3 mb-8 transition-transform ${pinError ? 'translate-x-[-10px] animate-pulse text-red-500' : ''}`}>
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pinInput.length > i ? 'bg-sapphire-500 scale-110' : 'bg-slate-200 dark:bg-slate-800'}`} />
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => {
                                            const newPin = pinInput + num;
                                            setPinInput(newPin);
                                            setPinError(false);
                                            if (newPin.length === 4) {
                                                if (newPin === user.guardian_pin) {
                                                    setShowPinModal(false);
                                                    setPinInput('');
                                                    setSettingsInitialSection(pendingSettingsAction?.section || 'profile');
                                                    setShowSettings(true);
                                                    setPendingSettingsAction(null);
                                                } else {
                                                    setPinError(true);
                                                    setPinInput('');
                                                    if (navigator.vibrate) navigator.vibrate(200);
                                                }
                                            }
                                        }}
                                        className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 font-bold text-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors dark:text-white active:scale-95"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div />
                                <button
                                    onClick={() => {
                                        const newPin = pinInput + '0';
                                        setPinInput(newPin);
                                        setPinError(false);
                                        if (newPin.length === 4) {
                                            if (newPin === user.guardian_pin) {
                                                setShowPinModal(false);
                                                setPinInput('');
                                                setSettingsInitialSection(pendingSettingsAction?.section || 'profile');
                                                setShowSettings(true);
                                                setPendingSettingsAction(null);
                                            } else {
                                                setPinError(true);
                                                setPinInput('');
                                                if (navigator.vibrate) navigator.vibrate(200);
                                            }
                                        }
                                    }}
                                    className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 font-bold text-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors dark:text-white active:scale-95"
                                >
                                    0
                                </button>
                                <button onClick={() => setPinInput(prev => prev.slice(0, -1))} className="h-14 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-95">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <button onClick={() => { setShowPinModal(false); setPinInput(''); }} className="text-sm font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} userSettings={user as User} onSave={updateUserSettings} initialSection={settingsInitialSection} t={speech.t} />
            <VitalsInput
                isOpen={showVitalsForm}
                onClose={() => { setShowVitalsForm(false); setEditingVitals(null); }}
                userId={user.id}
                onVitalsUpdated={() => {
                    vitalsData.fetchVitals();
                    setVitalsUpdateCount(c => c + 1);
                }}
                lastRecordedVitals={vitalsData.vitals}
                initialData={editingVitals}
            />
            <ConfirmationModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={confirmModal?.onConfirm || (() => { })}
                title={confirmModal?.title || ''}
                message={confirmModal?.message || ''}
                type={confirmModal?.type === 'warning' ? 'info' : confirmModal?.type}
            />
            <MedicineReminderAlert
                medicine={activeAlertMed}
                onClose={() => setActiveAlertMed(null)}
                onMarkAsTaken={async (id) => {
                    await fetch(`${API_BASE_URL}/medicines/${id}/taken`, { method: 'POST' });
                    vitalsData.fetchMedicines();
                    speech.speak("Thank you. Marked as taken.", 'en');
                    setActiveAlertMed(null);
                }}
            />
            <LocationTracker currentUser={user} />
            <NetworkHelpModal isOpen={showNetworkHelp} onClose={() => setShowNetworkHelp(false)} />
            <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
        </div >
    );
};

// Global set to prevent double-speech in StrictMode
const globalProcessedReminders = new Set<string>();

export default App;
