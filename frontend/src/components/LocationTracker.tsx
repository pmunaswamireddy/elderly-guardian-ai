import React, { useEffect } from 'react';
import { API_BASE_URL } from '../config';
import type { User } from '../types';

interface LocationTrackerProps {
    currentUser: User;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ currentUser }) => {
    useEffect(() => {
        if (!currentUser || !navigator.geolocation) return;

        const sendLocation = async (lat: number, lng: number) => {
            const userId = currentUser.id;
            if (!userId) {
                console.error("[LocationTracker] No user ID found in currentUser:", currentUser);
                return;
            }

            console.log("[LocationTracker] Sending update:", { userId, lat, lng });

            try {
                const res = await fetch(`${API_BASE_URL}/api/location`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        lat: lat,
                        lng: lng
                    })
                });
                if (!res.ok) {
                    const txt = await res.text();
                    console.error("[LocationTracker] Backend error:", res.status, txt);
                }
            } catch (e) {
                console.error("Location update failed", e);
            }
        };

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Basic throttling or significant change check could go here
                // For now, we trust the browser's watchPosition implementation
                // and add a manual throttle if needed in production
                sendLocation(latitude, longitude);
            },
            (error) => {
                if (error.code === error.TIMEOUT) {
                    console.warn("[Geolocation] Timeout, will retry automatically...");
                } else if (error.code === error.PERMISSION_DENIED) {
                    console.info("[Geolocation] Location permission denied - location tracking disabled");
                    // Silently handle permission denial - don't spam console
                } else {
                    console.warn("[Geolocation] Error:", error.message);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 5000 // Cache for 5s only for fresher data
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [currentUser]);

    return null; // Headless component
};

export default LocationTracker;
