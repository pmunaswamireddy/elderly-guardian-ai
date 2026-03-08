import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PhoneCall } from 'lucide-react';
import { User } from '../types';

interface SOSButtonProps {
    user: User;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ user }) => {
    const [sosActive, setSosActive] = useState(false);
    const [sosProgress, setSosProgress] = useState(0);
    const sosRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const startSosHold = () => {
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

    return (
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
    );
};
