import React from 'react';
import { motion } from 'framer-motion';

interface ToggleSwitchProps {
    isOn: boolean;
    onToggle: () => void;
    color?: string;
    disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isOn, onToggle, color = 'bg-sapphire-500', disabled = false }) => {
    return (
        <div
            className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${isOn ? color : 'bg-gray-300 dark:bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={!disabled ? onToggle : undefined}
        >
            <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md"
                layout
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                animate={{ x: isOn ? 24 : 0 }}
            />
        </div>
    );
};

export default ToggleSwitch;
