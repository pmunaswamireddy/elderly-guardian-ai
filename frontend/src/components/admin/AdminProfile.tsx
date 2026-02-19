import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, User, Lock, CheckCircle, AlertTriangle, Fingerprint, ShieldCheck, UserPlus, Key } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

const AdminProfile: React.FC = () => {
    // Current Admin State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Provision New Admin State
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [activeSubTab, setActiveSubTab] = useState<'profile' | 'provision'>('profile');
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setEmail(user.email || 'admin@elderlyguardian.com');
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('saving');

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id || 1; 

            const res = await fetch(`${API_BASE_URL}/api/admin/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    email,
                    password
                })
            });

            if (res.ok) {
                setStatus('success');
                setMessage('Credentials updated successfully. System synchronized.');
            } else {
                setStatus('error');
                setMessage('Synchronization failed. Verify input parameters.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Neural link interrupted. Check connection.');
        }
    };

    const handleProvisionAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('saving');

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail,
                    password: newPassword
                })
            });

            if (res.ok) {
                setStatus('success');
                setMessage(`Admin account provisioned for ${newEmail}`);
                setNewName('');
                setNewEmail('');
                setNewPassword('');
            } else {
                const data = await res.json();
                setStatus('error');
                setMessage(data.message || 'Provisioning failed. Email likely exists.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Network error during provisioning protocol.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-700">
            {/* Sub-Header Tabs */}
            <div className="flex justify-center">
                <div className="flex bg-slate-900/40 backdrop-blur-3xl p-1.5 rounded-2xl border border-white/5 shadow-2xl">
                    <button
                        onClick={() => { setActiveSubTab('profile'); setStatus('idle'); }}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                            activeSubTab === 'profile' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <User className="w-3 h-3" />
                        My Credentials
                    </button>
                    <button
                        onClick={() => { setActiveSubTab('provision'); setStatus('idle'); }}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                            activeSubTab === 'provision' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <UserPlus className="w-3 h-3" />
                        Provision Admin
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3.5rem] p-12 shadow-2xl border border-white/5 relative overflow-hidden group min-h-[500px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-colors duration-1000" />
                
                <AnimatePresence mode="wait">
                    {activeSubTab === 'profile' ? (
                        <motion.div
                            key="tab-profile"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-12"
                        >
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/20 shadow-xl group-hover:scale-110 transition-transform">
                                    <Fingerprint className="w-10 h-10" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl font-black text-white italic tracking-tight">IDENTITY VAULT</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Management of Root access credentials</p>
                                </div>
                                <div className="hidden md:block">
                                    <div className="px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em]">Auth Level</p>
                                        <p className="text-xs font-black text-white">SYSTEM_ADMIN</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="block text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] ml-1">Universal Access Email</label>
                                    <div className="relative group/input">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-white/5 rounded-2xl font-black text-sm text-white focus:ring-2 ring-indigo-500/20 outline-none transition-all placeholder:text-slate-700"
                                            placeholder="admin@elderlyguardian.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] ml-1">Encryption Secret (New Password)</label>
                                    <div className="relative group/input">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-white/5 rounded-2xl font-black text-sm text-white focus:ring-2 ring-indigo-500/20 outline-none transition-all placeholder:text-slate-700"
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                </div>

                                {status !== 'idle' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={cn(
                                            "p-5 rounded-2xl flex items-center gap-3 border",
                                            status === 'success' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}
                                    >
                                        {status === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'saving'}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] active:scale-95 group"
                                >
                                    {status === 'saving' ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                            <span className="text-xs uppercase tracking-[0.2em]">Synchronize Credentials</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="tab-provision"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-12"
                        >
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-amber-500/10 text-amber-400 rounded-3xl border border-amber-500/20 shadow-xl group-hover:scale-110 transition-transform">
                                    <UserPlus className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white italic tracking-tight uppercase">Provisioning</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Allocate new Administrative clearance</p>
                                </div>
                            </div>

                            <form onSubmit={handleProvisionAdmin} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="block text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] ml-1">Admin Callsign (Name)</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-white/5 rounded-2xl font-black text-sm text-white outline-none focus:ring-2 ring-amber-500/20"
                                            placeholder="Alpha Team Lead"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] ml-1">Access Email</label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="email"
                                            required
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-white/5 rounded-2xl font-black text-sm text-white outline-none focus:ring-2 ring-amber-500/20"
                                            placeholder="agent@guardian.grid"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] ml-1">Initialization Secret (Password)</label>
                                    <div className="relative">
                                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-white/5 rounded-2xl font-black text-sm text-white outline-none focus:ring-2 ring-amber-500/20"
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                </div>

                                {status !== 'idle' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "p-5 rounded-2xl flex items-center gap-3 border",
                                            status === 'success' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'saving'}
                                    className="w-full py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 border border-white/10 active:scale-95 disabled:opacity-50"
                                >
                                    {status === 'saving' ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            <span className="text-xs uppercase tracking-[0.2em]">Authorize Clearance</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-center text-[8px] font-black text-slate-700 uppercase tracking-[0.4em] mt-12">Security Protocol: Omega-7 Hierarchy Active</p>
            </div>
        </div>
    );
};

export default AdminProfile;
