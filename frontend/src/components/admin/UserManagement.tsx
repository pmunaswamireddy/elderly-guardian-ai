import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCheck, Trash2, Loader2, Mail, Phone, Fingerprint, ShieldAlert, Cpu } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

interface IUser {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    banned_until: string | null;
    created_at: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<IUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch(`${API_BASE_URL}/admin/users`)
            .then(res => res.json())
            .then(data => {
                setUsers(data.users || []);
                setIsLoading(false);
            })
            .catch((err: unknown) => {
                console.error("Error fetching users:", err);
                setIsLoading(false);
            });
    }, []);

    const handleBan = (userId: number, currentBanned: boolean) => {
        const action = currentBanned ? 'unban' : 'ban';
        const url = `${API_BASE_URL}/admin/users/${userId}/${action}?admin_id=1`;

        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: action === 'ban' ? JSON.stringify({ days: 7, reason: "Administrative action" }) : undefined
        };

        fetch(url, fetchOptions)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setUsers(prev => prev.map(u =>
                        u.id === userId
                            ? { ...u, banned_until: action === 'ban' ? 'active' : null }
                            : u
                    ));
                }
            })
            .catch(err => console.error(`Error ${action}ning user:`, err));
    };

    const handleDelete = (userId: number) => {
        if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;

        fetch(`${API_BASE_URL}/admin/users/${userId}?admin_id=1`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setUsers(prev => prev.filter(u => u.id !== userId));
                }
            })
            .catch(err => console.error("Error deleting user:", err));
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 text-white animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-3xl font-black italic tracking-tight">IDENTITY GRID</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Neural User Registry & Permission Matrix</p>
                </div>
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-0 bg-indigo-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Scan for identities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-slate-900/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] outline-none focus:ring-2 ring-indigo-500/30 font-black text-sm placeholder:text-slate-600 transition-all focus:bg-slate-900"
                    />
                </div>
            </div>

            <div className="bg-slate-950 rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden relative min-h-[500px]">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-10">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Decrypting Registry...</p>
                        </div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-32 text-center">
                        <Cpu className="w-16 h-16 text-slate-800 mx-auto mb-6 animate-pulse" />
                        <h4 className="text-2xl font-black text-slate-600 italic">No Identity Matches</h4>
                        <p className="text-xs font-bold text-slate-700 mt-2 uppercase tracking-widest">Global database search yielded zero results</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Neural Profile</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Data Endpoints</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Authority & Protocol</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Timestamp</th>
                                    <th className="px-10 py-6 text-right text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Override</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <AnimatePresence mode='popLayout'>
                                    {filteredUsers.map((user, idx) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                            className="hover:bg-white/[0.02] transition-colors group relative"
                                        >
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-[1.25rem] bg-slate-900 border border-white/10 flex items-center justify-center text-indigo-400 font-black text-xl shadow-2xl group-hover:scale-110 transition-transform relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/20 transition-colors" />
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors">{user.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Fingerprint className="w-3 h-3 text-slate-600" />
                                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ID: 0x{user.id.toString(16).toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                                                        <Mail className="w-3.5 h-3.5 text-indigo-500/50" />
                                                        {user.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                                                        <Phone className="w-3.5 h-3.5 text-indigo-500/50" />
                                                        {user.phone || 'No Linked Terminal'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col gap-2">
                                                    <span className={cn("inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest w-fit border shadow-inner",
                                                        user.role === 'admin' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                    )}>
                                                        {user.role}
                                                    </span>
                                                    <span className={cn("inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest w-fit border shadow-inner",
                                                        user.banned_until ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    )}>
                                                        {user.banned_until ? 'PROTOCOL: BANNED' : 'PROTOCOL: ACTIVE'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                                    {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                                                    <br />
                                                    <span className="text-[8px] text-slate-600">Cycle Initialization</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                                                    <button
                                                        onClick={() => handleBan(user.id, !!user.banned_until)}
                                                        title={user.banned_until ? "Unban Identity" : "Ban Identity"}
                                                        className={cn("p-4 rounded-2xl transition-all border",
                                                            user.banned_until 
                                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
                                                                : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                                                        )}
                                                    >
                                                        {user.banned_until ? <UserCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        title="Purge Identity"
                                                        className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-2xl transition-all border border-red-500/20"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
