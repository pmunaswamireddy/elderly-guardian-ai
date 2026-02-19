import { useEffect, useRef, useCallback } from 'react';

export function useInactivity(
    enabled: boolean | undefined,
    timeoutHours: number | undefined,
    onTimeout: () => void
) {
    const timeoutRef = useRef<number | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }

        if (enabled && timeoutHours && timeoutHours > 0) {
            const timeoutMs = timeoutHours * 60 * 60 * 1000;
            // const timeoutMs = 10000; // Debug: 10 seconds
            timeoutRef.current = window.setTimeout(() => {
                onTimeout();
            }, timeoutMs);
        }
    }, [enabled, timeoutHours, onTimeout]);

    useEffect(() => {
        if (!enabled) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Initial setup
        resetTimer();

        // Throttled event handler
        let lastThrottled = 0;
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastThrottled > 1000) { // Only reset once per second max to save perf
                resetTimer();
                lastThrottled = now;
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [enabled, timeoutHours, resetTimer]);
}
