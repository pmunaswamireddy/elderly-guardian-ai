
import { useState, useEffect } from 'react';
import { readStoredUserId, setStoredUserId, clearStoredUser } from '../storagePolicy';
import { API_BASE_URL } from '../config';
import type { User } from '../types';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    // Initial load
    useEffect(() => {
        const init = async () => {
            const savedUserId = readStoredUserId() || localStorage.getItem('user_id');
            if (savedUserId) {
                const id = Number(savedUserId);
                // Don't set isLoggedIn yet to keep the dashboard from rendering
                await fetchUserSettings(id);
                setIsLoggedIn(true);
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    const fetchUserSettings = async (userId: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${userId}`);
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                console.error(`User fetch failed: ${res.status}`);
                // If it fails, we might want to logout if it's a 401/403
                if (res.status === 401 || res.status === 404) {
                    setIsLoggedIn(false);
                    setUser(null);
                }
            }
        } catch (err) {
            console.error("Error fetching user settings:", err);
        } finally {
            setLoading(false);
        }
    };

    // Poll for User Status Updates (Role changes)
    useEffect(() => {
        if (!user?.id) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.role !== user.role) {
                        setUser(prev => prev ? { ...prev, role: data.role } : null);
                    }
                }
            } catch (e) {
                console.error("Failed to poll user status", e);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [user?.id, user?.role]);

    const guestLogin = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/guest-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                setIsLoggedIn(true);
                setStoredUserId(data.user?.id);
                return { success: true };
            }
            return { success: false, error: data.detail || 'Guest login failed' };
        } catch (err: unknown) {
            console.error("Guest login failed:", err);
            const errorMessage = err instanceof Error ? err.message : 'Connection error';
            return { success: false, error: errorMessage };
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name_or_email: email, password })
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                setIsLoggedIn(true);
                setStoredUserId(data.user?.id);
                return { success: true };
            }
            return { success: false, error: data.detail || 'Login failed' };
        } catch (err: unknown) {
            console.error("Login failed:", err);
            const errorMessage = err instanceof Error ? err.message : 'Connection error';
            return { success: false, error: errorMessage };
        }
    };

    const signup = async (formData: unknown) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                return { success: true };
            }
            return { success: false, error: data.detail || 'Signup failed' };
        } catch (err: unknown) {
            console.error("Signup failed:", err);
            const errorMessage = err instanceof Error ? err.message : 'Connection error';
            return { success: false, error: errorMessage };
        }
    };

    const logout = () => {
        clearStoredUser();
        setUser(null);
        setIsLoggedIn(false);
        window.location.reload();
    };

    const updateUserSettings = async (newSettings: Partial<User>) => {
        if (!user?.id) return;
        try {
            setUser(prev => prev ? { ...prev, ...newSettings } : null);
            const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            if (!res.ok) throw new Error('Settings update failed');
        } catch (e) {
            console.error('Settings sync error:', e);
        }
    };

    const oauthLogin = async (provider: string, email: string, name: string, avatar?: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/oauth-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, provider_email: email, provider_name: name, provider_avatar: avatar })
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                setIsLoggedIn(true);
                setStoredUserId(data.user?.id);
                return { success: true, is_new: data.is_new };
            }
            return { success: false, error: data.detail || 'OAuth login failed' };
        } catch (err: unknown) {
            console.error("OAuth login failed:", err);
            const errorMessage = err instanceof Error ? err.message : 'Connection error';
            return { success: false, error: errorMessage };
        }
    };

    return {
        user,
        isLoggedIn,
        loading,
        login,
        signup,
        logout,
        oauthLogin,
        guestLogin,
        updateUserSettings,
        refreshUser: () => user && fetchUserSettings(user.id)
    };
}
