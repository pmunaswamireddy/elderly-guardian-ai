export interface User {
    id: number;
    name: string;
    email?: string;
    role?: string;
    preferred_language?: string;
    ai_language?: string;
    ai_always_active?: boolean;
    theme?: 'light' | 'dark';
    font_size_scale?: number;
    ai_voice_gender?: string;
    ai_voice_pitch?: number;
    ai_voice_rate?: number;
    ai_voice_clarity?: number;
    ai_voice_model?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    phone?: string;
    voice_enabled?: boolean;
    ai_enabled?: boolean;
    voice_reminders_enabled?: boolean;
    booking_language?: string;
    booking_voice_gender?: string;
    avatar_url?: string;
    preferred_voice_uri?: string;
    emergency_hold_duration?: number;
    // Quiet Hours
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string; // e.g. "22:00"
    quiet_hours_end?: string;   // e.g. "07:00"
    // Guardian Lock
    guardian_pin?: string;      // 4-digit PIN
    // Accessibility
    high_contrast?: boolean;
    // Inactivity Monitor
    inactivity_check_enabled?: boolean;
    inactivity_timeout_hours?: number; // default 6
    // Magic Words
    magic_words_mappings?: Record<string, string>; // e.g., "red protocol" -> "silent_sos"
    // Medical Intelligence
    ai_medical_strict_mode?: boolean;
}

export interface Medicine {
    id: number;
    user_id?: number;
    name: string;
    dosage: string;
    time: string;
    after_meal: boolean;
    taken: boolean;
    frequency?: string;
    instructions?: string;
    added_at?: string;
    last_taken_at?: string;
}

export interface Appointment {
    id: number;
    user_id: number;
    doctor_name: string;
    specialty?: string;
    date: string;
    time: string;
    location?: string;
    notes?: string;
}

export interface VitalsRecord {
    id: number;
    user_id: number;
    bp_systolic: number;
    bp_diastolic: number;
    sugar_level: number;
    heart_rate: number;
    notes?: string;
    recorded_at?: string;
}

export interface AnalysisResult {
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

export interface AdminStats {
    total_users: number | string;
    uptime: string;
    total_content: number | string;
    total_media: number | string;
}

export interface AdminTask {
    label: string;
    count: number;
    highlight: boolean;
}
