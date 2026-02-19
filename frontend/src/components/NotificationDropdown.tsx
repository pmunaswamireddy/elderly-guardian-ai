import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Pill, Calendar, Activity } from 'lucide-react';
import { cn } from '../utils/cn';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    medicines: any[]; // Assuming Medicine type structure
    appointments?: any[];
    vitalsCheckedToday: boolean;
    isSimpleMode: boolean;
}

export function NotificationDropdown({
    isOpen,
    onClose,
    medicines,
    appointments = [],
    vitalsCheckedToday,
    isSimpleMode
}: NotificationDropdownProps) {

    // Filter for upcoming medicines (simplified logic for demo)
    const upcomingMedicines = medicines.filter(m => !m.taken).slice(0, 3);

    const hasNotifications = upcomingMedicines.length > 0 || appointments.length > 0 || !vitalsCheckedToday;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className={cn(
                            "absolute right-0 top-full mt-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 origin-top-right",
                            isSimpleMode ? "w-96" : "w-80"
                        )}
                    >
                        <div className="p-4 bg-sapphire-50/50 dark:bg-slate-800/50 flex justify-between items-center border-b border-sapphire-100 dark:border-slate-700">
                            <h3 className="font-bold !text-black dark:!text-white flex items-center gap-2">
                                <Bell className="w-5 h-5 text-sapphire-600 dark:text-sapphire-400" />
                                Notifications
                            </h3>
                            {hasNotifications && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                                    New
                                </span>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            {!hasNotifications ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>All caught up!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {/* Vitals Alert */}
                                    {!vitalsCheckedToday && (
                                        <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                            <div className="flex gap-3">
                                                <div className="p-2 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                                                    <Activity className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold !text-black dark:!text-white text-sm">Check Vital Signs</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">You haven't recorded your AI Health Report today.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Medicines */}
                                    {upcomingMedicines.map((med, i) => (
                                        <motion.div
                                            key={med.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex gap-3">
                                                <div className="p-2 bg-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
                                                    <Pill className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold !text-black dark:!text-white text-sm">Time for Medicine</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Take <span className="font-medium text-emerald-600 dark:text-emerald-400">{med.name}</span> ({med.dosage})
                                                    </p>
                                                    <p className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block mt-1.5 text-slate-500 dark:text-slate-400">
                                                        {med.time} • {med.frequency || 'Daily'} • {med.after_meal ? 'After Meal' : 'Before Meal'}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* Appointments */}
                                    {appointments.map((apt, i) => (
                                        <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                            <div className="flex gap-3">
                                                <div className="p-2 bg-sapphire-100 rounded-xl group-hover:scale-110 transition-transform">
                                                    <Calendar className="w-5 h-5 text-sapphire-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold !text-black dark:!text-white text-sm">Upcoming Appointment</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Dr. {apt.doctor_name}
                                                    </p>
                                                    <p className="text-[10px] bg-sapphire-50 dark:bg-sapphire-900/30 px-2 py-0.5 rounded-full inline-block mt-1.5 text-sapphire-600 dark:text-sapphire-300 font-medium">
                                                        {apt.date} at {apt.time}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={onClose} className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                                Dismiss All
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
