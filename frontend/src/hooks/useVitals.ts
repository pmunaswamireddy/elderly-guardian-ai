
import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import type { Medicine, Appointment } from '../types';

export function useVitals(userId?: number) {
    const [vitals, setVitals] = useState({
        bp: { systolic: 0, diastolic: 0, last_checked: 'Never' },
        sugar: { level: 0, last_checked: 'Never' },
        heart_rate: { bpm: 0, last_checked: 'Never' }
    });
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const fetchVitals = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/vitals?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setVitals({
                    bp: {
                        systolic: Number(data.bp?.systolic ?? data.bp_systolic ?? 0),
                        diastolic: Number(data.bp?.diastolic ?? data.bp_diastolic ?? 0),
                        last_checked: String(data.bp?.last_checked || data.recorded_at || 'Never')
                    },
                    sugar: {
                        level: Number(data.sugar?.level ?? data.sugar_level ?? 0),
                        last_checked: String(data.sugar?.last_checked || data.recorded_at || 'Never')
                    },
                    heart_rate: {
                        bpm: typeof data.heart_rate === 'object' ?
                            Number(data.heart_rate.bpm?.bpm ?? data.heart_rate.bpm ?? 0) :
                            Number(data.heart_rate ?? 0),
                        last_checked: typeof data.heart_rate === 'object' ?
                            String(data.heart_rate.last_checked || 'Never') :
                            String(data.recorded_at || 'Never')
                    }
                });
            }
        } catch (e) {
            console.warn("Failed to fetch vitals:", e);
        }
    }, [userId]);

    const fetchMedicines = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/medicines?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setMedicines(Array.isArray(data.medicines) ? data.medicines : []);
            }
        } catch (err) {
            console.error("Error fetching medicines:", err);
        }
    }, [userId]);

    const fetchAppointments = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/appointments?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setAppointments(data.appointments || []);
            }
        } catch (err) { }
    }, [userId]);

    const deleteVitals = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/vitals/${id}`, { method: 'DELETE' });
            if (res.ok) fetchVitals();
        } catch (e) { }
    };

    useEffect(() => {
        if (userId) {
            const init = async () => {
                await Promise.all([fetchVitals(), fetchMedicines(), fetchAppointments()]);
                setIsInitialLoad(false);
            };
            init();

            const interval = setInterval(() => {
                fetchVitals();
                fetchMedicines();
                fetchAppointments();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [userId, fetchVitals, fetchMedicines, fetchAppointments]);

    return {
        vitals,
        medicines,
        appointments,
        isInitialLoad,
        fetchVitals,
        fetchMedicines,
        fetchAppointments,
        deleteVitals
    };
}
