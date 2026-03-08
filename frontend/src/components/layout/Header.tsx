import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, History, Settings, LogOut, Bell, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { User, Appointment } from '../../types';
import { NotificationDropdown } from '../NotificationDropdown';

interface HeaderProps {
    user: User;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    speech: any; // Simplified type for prompt extraction
    updateUserSettings: (settings: Partial<User>) => void;
    setShowInfo: (val: boolean) => void;
    setShowHistoryModal: (val: boolean) => void;
    handleOpenSettings: (section: string) => void;
    logout: () => void;
    showNotifications: boolean;
    setShowNotifications: (val: boolean) => void;
    vitalsData: any;
    isSimpleMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
    user,
    activeTab,
    setActiveTab,
    speech,
    updateUserSettings,
    setShowInfo,
    setShowHistoryModal,
    handleOpenSettings,
    logout,
    showNotifications,
    setShowNotifications,
    vitalsData,
    isSimpleMode
}) => {
    return (
        <header className="p-6 flex justify-between items-center max-w-5xl mx-auto w-full sticky top-0 z-50 bg-transparent backdrop-blur-sm">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">EG</div>
                <div>
                    <h2 className="text-xl font-black">{speech.t('hello')}, {user.name?.split(' ')[0] || 'Guardian'}</h2>
                    <p className="text-sm font-bold opacity-70">{speech.t('feeling_today')}</p>
                </div>
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
                    {((vitalsData.medicines?.filter((m: any) => !m.taken)?.length || 0) + (vitalsData.appointments?.length || 0)) > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />}
                </button>
                <NotificationDropdown isOpen={showNotifications} onClose={() => setShowNotifications(false)} medicines={vitalsData.medicines} appointments={vitalsData.appointments as Appointment[]} vitalsCheckedToday={vitalsData.vitals.heart_rate.last_checked !== 'Never'} isSimpleMode={isSimpleMode} />
            </div>
        </header>
    );
};
