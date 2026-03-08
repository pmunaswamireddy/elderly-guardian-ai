import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';
import { Activity, Calendar, BarChart2, Pill, Camera, Shield, Users, BarChart3, Database, Monitor, MessageSquare, X } from 'lucide-react';
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
import OAuthModal from './components/OAuthModal';
import { ProfileCompletionView } from './components/auth/ProfileCompletionView';
import { supabase } from './supabaseClient';
import { SOSButton } from './components/SOSButton';
import { Header } from './components/layout/Header';


const ParticleBackground: React.FC = () => (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                initial={{
                    x: Math.random() * 1920,
                    y: Math.random() * 1080,
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

const App: React.FC = () => {
    // --- Hooks ---
    const { user, isLoggedIn, loading, login, signup, logout, oauthLogin, guestLogin, updateUserSettings, refreshUser } = useAuth();
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
    const [showDeveloperInfo, setShowDeveloperInfo] = useState(false);
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
    const [showPassword, setShowPassword] = useState(false);
    const [enable2FA, setEnable2FA] = useState(false);
    const [authToast, setAuthToast] = useState<{ message: string; type: 'info' | 'success' | 'error'; icon?: string } | null>(null);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const [oauthModal, setOauthModal] = useState<{ id: string; name: string; color: string; bgColor: string; icon: React.ReactNode; email: string; displayName: string; avatar?: string } | null>(null);
    const [emailValid, setEmailValid] = useState<{ valid: boolean; reason: string; checking: boolean } | null>(null);
    const emailValidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isCompletingProfile, setIsCompletingProfile] = useState(false);
    const [setupForm, setSetupForm] = useState({ username: '', password: '', confirmPassword: '' });
    const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; reason: string; checking: boolean } | null>(null);
    const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' } | null>(null);
    const [activeAlertMed, setActiveAlertMed] = useState<Medicine | null>(null);
    const [facialAnalysisData, setFacialAnalysisData] = useState<AnalysisResult | null>(null);
    const [vitalsUpdateCount, setVitalsUpdateCount] = useState(0);
    const [isSimpleMode] = useState(true);
    const [vitalsUpdateCount, setVitalsUpdateCount] = useState(0);
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
            if (userRef.current?.ai_always_active && !isManual) {
                const triggers = ['guardian', 'g', 'gee', 'ji', 'guard', 'కేజీ', 'గార్డియన్', 'నమస్కారం', 'गार्जियन', 'नमस्ते'];
                const textLower = text.toLowerCase();
                const hasWakeWord = triggers.some(t => textLower.includes(t));
                if (!hasWakeWord) {
                    console.log(`[AlwaysOn] Ignored '${text}' (No Wake Word)`);
                    if (speechRef.current) {
                        speechRef.current.setAiResponse(`👂 Hearing: "${text.substring(0, 15)}..."`);
                        setTimeout(() => speechRef.current?.setAiResponse(''), 3000);
                    }
                    return;
                }
            }

            if (user?.magic_words_mappings) {
                const lowerText = text.toLowerCase().trim().replace(/[.,!]/g, '');
                for (const [trigger, action] of Object.entries(user.magic_words_mappings)) {
                    if (lowerText === trigger.toLowerCase()) {
                        if (action === 'silent_sos' && user.emergency_contact_phone) {
                            window.location.href = `tel:${user.emergency_contact_phone}`;
                            return;
                        }
                        if (action === 'goodnight_protocol') {
                            updateUserSettings({ theme: 'dark', quiet_hours_enabled: true });
                            speechRef.current?.speak("Goodnight Protocol Initiated. Sleep well.", user.preferred_language || 'en');
                            return;
                        }
                        if (action === 'morning_protocol') {
                            updateUserSettings({ theme: 'light', quiet_hours_enabled: false });
                            speechRef.current?.speak("Good Morning Protocol Initiated. Have a great day.", user.preferred_language || 'en');
                            return;
                        }
                    }
                }
            }

            if (speechRef.current) {
                speechRef.current.stopListening();
                speechRef.current.setIsProcessing(true);
            }

            setChatHistory(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);

            const data = await aiEngine.handleChat(text);
            if (data) {
                speechRef.current?.setAiResponse(data.response_text);
                setChatHistory(prev => [...prev, { role: 'assistant', text: data.response_text, timestamp: Date.now() }]);
                const lang = userRef.current?.ai_language || userRef.current?.preferred_language || 'en';
                if (speechRef.current) {
                    speechRef.current.speak(data.response_text, lang);
                    speechRef.current.setIsProcessing(false);
                }
                if (data.intent === 'navigate' || data.intent === 'ui_navigate') {
                    const target = data.parameters?.target || data.parameters?.page;
                    if (['home', 'meds', 'chat', 'stats', 'docs', 'face', 'predict', 'admin'].includes(target)) {
                        if (target === 'admin' && user?.role !== 'admin') {
                            speechRef.current?.speak("I'm sorry, access to the admin panel is restricted.", user?.ai_language || 'en');
                            return;
                        }
                        setActiveTab(target as typeof activeTab);
                    }
                }
            }
        },
        user?.ai_language || user?.preferred_language || 'en', // speechLang (AI/Voice)
        user?.preferred_language || 'en',                     // uiLang (App Text)
        user || undefined,
        activeTab === 'docs' || activeTab === 'chat'           // isDisabled
    );
    useEffect(() => {
        speechRef.current = speech;
    }, [speech]);

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
    }, [user, vitalsData, activeAlertMed, speech]);

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


    // Helper: show a toast notification on the auth page
    const showAuthToast = (message: string, type: 'info' | 'success' | 'error' = 'info', icon?: string) => {
        setAuthToast({ message, type, icon });
        setTimeout(() => setAuthToast(null), 3000);
    };

    // OAuth provider configurations
    const OAUTH_PROVIDERS: Record<string, { name: string; color: string; bgColor: string; icon: React.ReactNode; email: string; displayName: string }> = {
        Google: { name: 'Google', color: '#4285F4', bgColor: 'rgba(66,133,244,0.15)', icon: <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />, email: 'user@gmail.com', displayName: 'Google User' },
        GitHub: { name: 'GitHub', color: '#333', bgColor: 'rgba(255,255,255,0.08)', icon: <Github className="w-5 h-5 text-white" />, email: 'dev@github.com', displayName: 'GitHub Developer' },
    };

    // Open Supabase OAuth for a provider
    const handleSocialLogin = async (providerName: string) => {
        setSocialLoading(providerName);
        setAuthError('');
        
        try {
            const providerMap: Record<string, 'google' | 'github' | 'apple' | 'linkedin_oidc'> = {
                Google: 'google',
                GitHub: 'github',
                Apple: 'apple',
                LinkedIn: 'linkedin_oidc'
            };
            const provider = providerMap[providerName];
            if (!provider) throw new Error("Unsupported provider");

            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}`
                }
            });
            if (error) throw error;
        } catch (err: unknown) {
            console.error(err);
            setSocialLoading(null);
            showAuthToast('OAuth connection failed', 'error', '❌');
        }
    };

    // Listen for Supabase redirect / login success
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user && !isLoggedIn) {
                const subUser = session.user;
                const email = subUser.email || '';
                const name = subUser.user_metadata?.full_name || subUser.user_metadata?.name || email.split('@')[0];
                const avatar = subUser.user_metadata?.avatar_url;
                const provider = subUser.app_metadata?.provider || 'supabase';
                
                setSocialLoading(provider);
                showAuthToast('Authenticating with backend...', 'info', '🔑');
                const result = await oauthLogin(provider, email, name, avatar);
                setSocialLoading(null);
                
                if (result.success) {
                    if (result.is_new) {
                        setIsCompletingProfile(true);
                        setSetupForm(prev => ({ ...prev, username: name.toLowerCase().replace(/\s+/g, '_') }));
                        showAuthToast('Complete your profile to finish setup!', 'info', '✨');
                    } else {
                        showAuthToast(`Welcome back!`, 'success', '✅');
                    }
                } else {
                    showAuthToast(result.error || 'Login failed', 'error', '❌');
                    await supabase.auth.signOut();
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [isLoggedIn]);

    // Handle dummy OAuth success callback (kept as fallback if needed)
    const handleOAuthSuccess = async (data: { provider: string; email: string; name: string; avatar?: string }) => {
        setOauthModal(null);
        setSocialLoading(data.provider);
        showAuthToast('Signing you in...', 'info', '🔑');
        const result = await oauthLogin(data.provider, data.email, data.name, data.avatar);
        setSocialLoading(null);
        if (result.success) {
            if (result.is_new) {
                setIsCompletingProfile(true);
                setSetupForm(prev => ({ ...prev, username: data.name.toLowerCase().replace(/\s+/g, '_') }));
                showAuthToast('Complete your profile to finish setup!', 'info', '✨');
            } else {
                showAuthToast(`Welcome back via ${data.provider}!`, 'success', '✅');
            }
        } else {
            showAuthToast(result.error || 'OAuth login failed', 'error', '❌');
        }
    };

    // Username availability checker
    const checkUsernameAvailability = (username: string) => {
        if (usernameTimer.current) clearTimeout(usernameTimer.current);
        if (!username || username.length < 3) { setUsernameStatus(null); return; }
        
        setUsernameStatus({ available: false, reason: '', checking: true });
        usernameTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/check-username/${username}`);
                const data = await res.json();
                setUsernameStatus({ available: data.available, reason: data.reason, checking: false });
            } catch (err) {
                setUsernameStatus({ available: false, reason: 'Check failed', checking: false });
            }
        }, 500);
    };

    // Save profile completion data (username/password)
    const handleCompleteProfile = async () => {
        if (!user || !setupForm.username) return;
        if (setupForm.password && setupForm.password !== setupForm.confirmPassword) {
            showAuthToast('Passwords do not match', 'error', '⚠️');
            return;
        }
        if (!usernameStatus?.available) {
            showAuthToast('Please choose an available username', 'error', '⚠️');
            return;
        }

        setSocialLoading('complete-profile');
        try {
            // 1. Update Username
            const userRes = await fetch(`${API_BASE_URL}/api/users/${user.id}/username`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: setupForm.username })
            });
            const userData = await userRes.json();
            if (!userRes.ok) throw new Error(userData.detail || 'Username update failed');

            // 2. Update Password (if provided)
            if (setupForm.password) {
                const passRes = await fetch(`${API_BASE_URL}/api/users/${user.id}/password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: setupForm.password })
                });
                if (!passRes.ok) throw new Error('Password update failed');
            }

            showAuthToast('Profile setup complete! Welcome to Guardian.', 'success', '🎉');
            setIsCompletingProfile(false);
            // Refresh user data if needed
            await refreshUser();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to complete profile';
            console.error("Profile completion failed:", err);
            showAuthToast(errorMessage, 'error', '❌');
        } finally {
            setSocialLoading(null);
        }
    };

    // Email validation with debounce
    const validateEmail = (email: string) => {
        if (emailValidTimer.current) clearTimeout(emailValidTimer.current);
        if (!email || email.length < 5) { setEmailValid(null); return; }
        setEmailValid({ valid: false, reason: '', checking: true });
        emailValidTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/validate-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                setEmailValid({ valid: data.valid, reason: data.reason, checking: false });
            } catch {
                setEmailValid({ valid: true, reason: 'Could not verify', checking: false });
            }
        }, 500);
    };


    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    if (!isLoggedIn || !user) {
        return (
            <div className="h-screen w-full flex flex-col md:flex-row bg-[#020617] overflow-hidden selection:bg-sapphire-500/30 relative">
                {/* Left Side: Cyber Visual Branding (Balanced for 100vh) */}
                <div className="hidden md:flex flex-1 p-0 flex-col justify-center items-center text-white relative h-full bg-[#020617] border-r border-white/5">
                    <ParticleBackground />
                    
                    <div className="w-full h-full flex flex-col items-center justify-around py-12 px-12 relative z-10">
                        {/* Glowing Portal Visual */}
                        <div className="cyber-portal-ring scale-75 lg:scale-90">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                            >
                                <Shield className="w-16 h-16 md:w-20 md:h-20 text-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]" />
                            </motion.div>
                        </div>

                        <div className="text-center space-y-6 max-w-lg">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-slate-50 premium-text-glow leading-tight mb-2">
                                    Welcome Back,<br />
                                    <span className="magical-text italic glitter-text text-emerald-400 text-6xl lg:text-7xl">Guardian.</span>
                                </h1>
                                <p className="text-slate-400 text-base mt-6 font-semibold italic opacity-80 max-w-md mx-auto">
                                    "Peace of mind is just a login away. Your safety is our priority."
                                </p>
                            </motion.div>

                            {/* Condensed Feature Cards */}
                            <div className="grid grid-cols-2 gap-5 w-full mt-4">
                                {[
                                    { icon: <Activity className="w-6 h-6 text-emerald-400" />, title: 'AI Health', desc: 'Real-time' },
                                    { icon: <Clock className="w-6 h-6 text-blue-400" />, title: 'Reminders', desc: 'Smart alerts' },
                                    { icon: <MapPin className="w-6 h-6 text-purple-400" />, title: 'Live GPS', desc: 'Safety net' },
                                    { icon: <Lock className="w-6 h-6 text-amber-400" />, title: 'Secure', desc: 'Encrypted' }
                                ].map((feat, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
                                        <div className="p-3 bg-white/5 rounded-xl">{feat.icon}</div>
                                        <div className="text-left">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">{feat.title}</h4>
                                            <p className="text-xs text-slate-500 font-medium">{feat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Trust Badge */}
                            <div className="flex items-center justify-center gap-3 py-2 px-4 bg-emerald-500/5 border border-emerald-500/10 rounded-full w-fit mx-auto">
                                <UserCheck className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">2,847+ Active Guardians</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="p-2 bg-emerald-500/20 rounded-full border border-emerald-500/30 mb-2"
                            >
                                <Heart className="w-5 h-5 text-emerald-400" />
                            </motion.div>
                            <span className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">Elderly Guardian AI</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Auth Form (Forced Single Page) */}
                <div className="flex-1 flex items-center justify-center p-0 bg-slate-950 relative overflow-hidden grid-dots-bg h-full">
                    {/* Background Visuals */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-emerald-600/5 pointer-events-none" />
                    <motion.div
                        className="lens-flare"
                        animate={{ x: mousePos.x - window.innerWidth / 2 - 100, y: mousePos.y - 100 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    />

                    {/* Toast Notification */}
                    <AnimatePresence>
                        {authToast && (
                            <motion.div
                                initial={{ opacity: 0, y: -30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`fixed top-6 z-50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
                                    authToast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    authToast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}
                            >
                                <span>{authToast.icon || '💡'}</span>
                                <span className="text-xs font-bold">{authToast.message}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="w-full h-full max-w-xl xl:max-w-2xl flex flex-col justify-center px-8 md:px-16 pt-8 pb-4 relative z-10">
                        <div className="w-full space-y-5 xl:space-y-6">
                            <div className="text-center md:text-left mb-6 xl:mb-8">
                                <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight premium-text-glow leading-tight">
                                    {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                                </h2>
                                <p className="text-slate-500 text-sm mt-3 uppercase tracking-widest font-bold">
                                    {authMode === 'signin' ? 'Secure Login Access' : 'Join the Guardian Network'}
                                </p>
                            </div>

                            <AnimatePresence mode="wait">
                                {isCompletingProfile ? (
                                    <motion.div
                                        key="complete-profile"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                    >
                                        <ProfileCompletionView
                                            username={setupForm.username}
                                            setUsername={(v) => setSetupForm({ ...setupForm, username: v })}
                                            password={setupForm.password}
                                            setPassword={(v) => setSetupForm({ ...setupForm, password: v })}
                                            confirmPassword={setupForm.confirmPassword}
                                            setConfirmPassword={(v) => setSetupForm({ ...setupForm, confirmPassword: v })}
                                            onSubmit={handleCompleteProfile}
                                            loading={socialLoading === 'complete-profile'}
                                            usernameStatus={usernameStatus}
                                            onCheckUsername={checkUsernameAvailability}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key={authMode}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                    <form 
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            setAuthError('');
                                            
                                            // Enforce validation
                                            if (authMode === 'signin') {
                                                if (!authForm.email.trim() || !authForm.password.trim()) {
                                                    setAuthError('Please enter both email and password');
                                                    return;
                                                }
                                            } else {
                                                if (!authForm.email.trim() || !authForm.password.trim() || !authForm.name.trim()) {
                                                    setAuthError('Please fill in all required fields');
                                                    return;
                                                }
                                            }

                                            const res = authMode === 'signin' ? await login(authForm.email, authForm.password) : await signup(authForm);
                                            if (!res.success) setAuthError(res.error || 'Failed');
                                            else if (authMode === 'signup') setAuthMode('signin');
                                        }}
                                        className={`space-y-4 ${authMode === 'signup' ? 'max-h-[50vh] overflow-y-auto scrollbar-refined pr-2 py-2' : ''}`}
                                    >
                                        {/* Error Alert */}
                                        {authError && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold text-center">
                                                {authError}
                                            </div>
                                        )}
                                        <div className="space-y-4 xl:space-y-6">
                                            {authMode === 'signin' ? (
                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Email</label>
                                                        <div className="relative">
                                                            <input type="email" placeholder="you@example.com" className="w-full auth-input-refined py-3.5 text-sm" value={authForm.email} onChange={e => { setAuthForm({...authForm, email: e.target.value}); }} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Password</label>
                                                        <div className="relative">
                                                            <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full auth-input-refined py-3.5 text-sm" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors scale-110">
                                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Full Name</label>
                                                        <input type="text" placeholder="John Doe" className="w-full auth-input-refined py-3.5 text-sm" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Email</label>
                                                        <div className="relative">
                                                            <input type="email" placeholder="you@example.com" className="w-full auth-input-refined py-3.5 text-sm" value={authForm.email} onChange={e => { setAuthForm({...authForm, email: e.target.value}); validateEmail(e.target.value); }} />
                                                            {emailValid?.checking && <div className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" />}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Emergency Phone</label>
                                                        <div className="relative">
                                                            <input type="tel" placeholder="+1 (555) 000-0000" className="w-full auth-input-refined py-3.5 text-sm" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Password</label>
                                                        <div className="relative">
                                                            <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full auth-input-refined py-3.5 text-sm" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors scale-110">
                                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Extra Fields (Signup Only) - Scrollable */}
                                            {authMode === 'signup' && (
                                                <>
                                                    <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                        <div className="flex items-center gap-2">
                                                            <Fingerprint className="w-4 h-4 text-purple-400" />
                                                            <span className="text-[10px] font-bold text-slate-400">Enable 2FA Protection</span>
                                                        </div>
                                                        <button type="button" onClick={() => setEnable2FA(!enable2FA)} className={`w-10 h-5 rounded-full relative transition-colors ${enable2FA ? 'bg-purple-500' : 'bg-slate-800'}`}>
                                                            <motion.div animate={{ x: enable2FA ? 22 : 2 }} className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                            {authMode === 'signin' && (
                                                <div className="w-full flex justify-end -mt-2 pr-4 z-40 relative">
                                                    <div className="h-4" />
                                                </div>
                                            )}

                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-500/20 transition-all">
                                                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                                            </motion.button>

                                            {authMode === 'signin' ? (
                                                <motion.button
                                                    type="button"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={async () => {
                                                        setSocialLoading('guest');
                                                        showAuthToast('Launching demo...', 'info', '🚀');
                                                        const res = await guestLogin();
                                                        setSocialLoading(null);
                                                        if (!res.success) showAuthToast(res.error, 'error', '❌');
                                                    }}
                                                    disabled={socialLoading === 'guest'}
                                                    className="w-full py-4 border border-dashed border-slate-700 rounded-full text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    {socialLoading === 'guest' ? <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Zap className="w-4 h-4" />}
                                                    Quick Demo
                                                </motion.button>
                                            ) : (
                                                <motion.button
                                                    type="button"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setAuthMode('signin')}
                                                    className="w-full py-4 border border-dashed border-slate-700 rounded-full text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Back to Login
                                                </motion.button>
                                            )}
                                        </div>
                                    </form>
                                </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Divider & Socials */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Secure Connect</span>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {['Google', 'GitHub'].map(p => (
                                        <button key={p} onClick={() => handleSocialLogin(p)} className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/[0.1] hover:border-white/20 transition-all gap-4 group">
                                            <div className="scale-110">
                                                {OAUTH_PROVIDERS[p].icon}
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{p}</span>
                                        </button>
                                    ))}
                                </div>

                                {authMode === 'signin' && (
                                    <button
                                        onClick={() => setAuthMode('signup')}
                                        className="w-full text-center text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors py-3 mt-2"
                                    >
                                        Need an account? Sign Up
                                    </button>
                                )}
                            </div>

                            {/* Security Footer */}
                            <div className="flex items-center justify-center gap-2 pt-2 opacity-30">
                                <Shield className="w-3 h-3 text-emerald-400" />
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">End-to-End Encrypted · HIPAA Compliant</span>
                            </div>

                            {/* Developer Recognition - Modal Trigger */}
                            <div className="mt-4 flex flex-col items-center justify-center border-t border-slate-800/50 pt-4 pb-2">
                                <button 
                                    onClick={() => setShowDeveloperInfo(true)}
                                    className="flex items-center gap-3 px-6 py-2.5 border-2 border-blue-600/60 rounded-full hover:bg-blue-600/10 hover:border-blue-500 transition-all group shadow-lg shadow-blue-900/20"
                                >
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-blue-200 transition-colors">Developed By PMR</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OAuth Multi-step Modal */}
                {oauthModal && (
                    <OAuthModal
                        provider={oauthModal}
                        onClose={() => { setOauthModal(null); setSocialLoading(null); }}
                        onSuccess={handleOAuthSuccess}
                    />
                )}
                
                {/* Developer Info Modal */}
                <AnimatePresence>
                    {showDeveloperInfo && (
                        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#020617] border border-slate-700/50 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
                            >
                                <button 
                                    onClick={() => setShowDeveloperInfo(false)}
                                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-all z-10"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="p-8 pb-8 flex flex-col items-center text-center">
                                    <div className="mb-6 relative">
                                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full" />
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl relative text-white font-black text-3xl border border-white/10 tracking-tighter">
                                            AI
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-1">PMR</h3>
                                    <p className="text-sm font-bold text-purple-500 tracking-widest uppercase mb-6 drop-shadow-md">With AI</p>
                                    
                                    <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide mb-8">B.Tech (AI & DS) @ <span className="text-slate-300">MTIEAT</span> (3-1)</p>
                                    
                                    <div className="w-full space-y-3">
                                        <div className="flex items-center gap-4 p-4 bg-slate-800/30 border border-slate-700/50 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all rounded-2xl group cursor-pointer" onClick={() => window.open('mailto:venoxvenom00000@gmail.com')}>
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <div className="w-5 h-3.5 bg-blue-400 rounded-[2px] flex items-center justify-center opacity-80"><div className="w-0 h-0 border-l-[5px] border-l-transparent border-t-[5px] border-t-[#020617] group-hover:border-t-blue-900 border-r-[5px] border-r-transparent" style={{marginTop: '-2px'}}></div></div>
                                            </div>
                                            <span className="text-xs sm:text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">venoxvenom00000@gmail.com</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 p-4 bg-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all rounded-2xl group cursor-pointer" onClick={() => {}}>
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0788.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg>
                                            </div>
                                            <span className="text-xs sm:text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">Discord: casmonox</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen transition-all duration-500 pb-24", user.theme === 'dark' ? "bg-[#020617] text-white" : "bg-slate-50 text-slate-900")}>
            <Header
                user={user as User}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                speech={speech}
                updateUserSettings={updateUserSettings}
                setShowInfo={setShowInfo}
                setShowHistoryModal={setShowHistoryModal}
                handleOpenSettings={handleOpenSettings}
                logout={logout}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
                vitalsData={vitalsData}
                isSimpleMode={isSimpleMode}
            />

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
                <SOSButton user={user as User} />
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
