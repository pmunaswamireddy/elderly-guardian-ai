import React, { useEffect, useState } from 'react';
import { Save, Globe, Palette, Shield, Zap, Mail, Link as LinkIcon, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config';

const SystemSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'branding' | 'security' | 'integrations'>('branding');
    const [settings, setSettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE_URL}/admin/settings`)
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching settings:", err);
                setIsLoading(false);
            });
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        fetch(`${API_BASE_URL}/admin/settings?admin_id=1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                branding: settings.branding,
                config: settings.config
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Settings saved successfully!");
                }
                setIsSaving(false);
            })
            .catch(err => {
                console.error("Error saving settings:", err);
                setIsSaving(false);
            });
    };

    const updateBranding = (field: string, value: any) => {
        setSettings((prev: any) => ({
            ...prev,
            branding: { ...prev.branding, [field]: value }
        }));
    };

    const updateConfig = (field: string, value: any) => {
        setSettings((prev: any) => ({
            ...prev,
            config: { ...prev.config, [field]: value }
        }));
    };

    return (
        <div className="space-y-8 text-white">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">System Control</h3>
                    <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Configure core platform behaviors and aesthetics</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 group hover:scale-105"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <div className="flex gap-8 relative items-start">
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md z-20 flex items-center justify-center rounded-[3rem]">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                )}
                
                {/* Navigation Sidebar */}
                <div className="w-64 space-y-3 shrink-0">
                    {[
                        { id: 'branding', label: 'Branding', icon: Palette, color: 'text-pink-400' },
                        { id: 'security', label: 'Security', icon: Shield, color: 'text-emerald-400' },
                        { id: 'integrations', label: 'Integrations', icon: Zap, color: 'text-amber-400' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "w-full flex items-center gap-4 px-6 py-5 rounded-3xl font-black transition-all border border-transparent",
                                activeTab === tab.id 
                                    ? "bg-indigo-500/10 border-indigo-500/50 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? tab.color : "text-slate-600")} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area - Premium Glassmorphism */}
                <div className="flex-1 bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl min-h-[600px] overflow-hidden relative">
                    <div className="p-10">
                        {settings && activeTab === 'branding' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                <div>
                                    <h4 className="text-xl font-black mb-8 flex items-center gap-3">
                                        <Palette className="text-pink-400" /> Visual Identity
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Site Label</label>
                                            <input
                                                type="text"
                                                value={settings.branding?.site_name || ''}
                                                onChange={(e) => updateBranding('site_name', e.target.value)}
                                                className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl font-bold text-white focus:ring-2 ring-indigo-500/30 outline-none transition-all placeholder:text-slate-600 focus:bg-white/10"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Support Endpoint</label>
                                            <input
                                                type="email"
                                                value={settings.branding?.email || ''}
                                                onChange={(e) => updateBranding('email', e.target.value)}
                                                className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl font-bold text-white focus:ring-2 ring-indigo-500/30 outline-none transition-all placeholder:text-slate-600 focus:bg-white/10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <h5 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-6">System Palette</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Primary', field: 'primary_color', default: '#6366f1' },
                                            { label: 'Success', field: 'secondary_color', default: '#10b981' },
                                            { label: 'Surface', field: 'surface_color', default: '#0f172a' },
                                            { label: 'Accent', field: 'accent_color', default: '#f43f5e' },
                                        ].map(c => (
                                            <div key={c.label} className="p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
                                                <div className="w-full h-14 rounded-2xl mb-4 shadow-inner ring-1 ring-white/10" style={{ backgroundColor: settings.branding?.[c.field] || c.default }}>
                                                    <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
                                                </div>
                                                <span className="text-[9px] font-black uppercase text-slate-500 mb-1 block">{c.label}</span>
                                                <input
                                                    type="text"
                                                    value={settings.branding?.[c.field] || c.default}
                                                    onChange={(e) => updateBranding(c.field, e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 font-black text-xs text-white outline-none cursor-text focus:text-indigo-400 transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {settings && activeTab === 'security' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                <h4 className="text-xl font-black flex items-center gap-3">
                                    <Shield className="text-emerald-400" /> Security Protocols
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Two-Factor Auth', field: 'two_factor_enforced', desc: 'Secure admin authentication' },
                                        { label: 'Session Armor', field: 'session_timeout_enabled', desc: 'Auto timeout after 20m of inactivity' },
                                        { label: 'Network Guard', field: 'ip_whitelist_enabled', desc: 'Restrict access to trusted IPs only' },
                                        { label: 'Shadow Logging', field: 'audit_logging_enabled', desc: 'Immutable tracking of all admin actions' },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center justify-between p-8 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-white/10 transition-all group">
                                            <div>
                                                <p className="font-black text-lg group-hover:text-white transition-colors text-slate-200">{item.label}</p>
                                                <p className="text-xs font-bold text-slate-500 mt-1">{item.desc}</p>
                                            </div>
                                            <div
                                                onClick={() => updateConfig(item.field, !settings.config?.[item.field])}
                                                className={cn(
                                                    "w-16 h-8 rounded-full relative transition-all cursor-pointer p-1",
                                                    settings.config?.[item.field] ? "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-slate-800"
                                                )}
                                            >
                                                <div className={cn("absolute bg-white w-6 h-6 rounded-full shadow-lg transition-all transform", settings.config?.[item.field] ? "translate-x-8" : "translate-x-0")} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {settings && activeTab === 'integrations' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                {[
                                    { name: 'Observer API', field: 'google_analytics_active', desc: 'Telemetry and behavioral analytics', icon: Globe, color: 'text-indigo-400' },
                                    { name: 'Quantum Mail', field: 'sendgrid_active', desc: 'Encrypted verification systems', icon: Mail, color: 'text-pink-400' },
                                    { name: 'Grid Alert', field: 'slack_notifications_active', desc: 'Neural network status broadcasting', icon: Zap, color: 'text-amber-400' },
                                    { name: 'Core CRM', field: 'project_crm_active', desc: 'Clinical database synchronization', icon: LinkIcon, color: 'text-blue-400' },
                                ].map(item => (
                                    <div key={item.name} className="p-10 bg-white/5 rounded-[3rem] border border-white/5 group hover:bg-white/10 transition-all hover:-translate-y-1 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-10 -mt-10" />
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="p-5 bg-slate-950/50 backdrop-blur-xl rounded-2xl border border-white/5 text-slate-400 group-hover:text-white transition-all shadow-xl">
                                                <item.icon className={cn("w-7 h-7", item.color)} />
                                            </div>
                                            <button
                                                onClick={() => updateConfig(item.field, !settings.config?.[item.field])}
                                                className={cn("text-[9px] font-black px-4 py-2 rounded-xl transition-all border",
                                                    settings.config?.[item.field] 
                                                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                                                        : "bg-slate-950/50 border-white/10 text-slate-500"
                                                )}
                                            >
                                                {settings.config?.[item.field] ? 'ONLINE' : 'OFFLINE'}
                                            </button>
                                        </div>
                                        <h4 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors">{item.name}</h4>
                                        <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
                                        <button className="w-full mt-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest shadow-sm">Initialize Interface</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
