import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Shield } from 'lucide-react';

interface ProfileCompletionProps {
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
  usernameStatus: { available: boolean; reason: string; checking: boolean } | null;
  onCheckUsername: (username: string) => void;
}

export const ProfileCompletionView: React.FC<ProfileCompletionProps> = ({
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  loading,
  usernameStatus,
  onCheckUsername,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center md:text-left">
        <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight premium-text-glow leading-tight">
          Complete Profile
        </h2>
        <p className="text-slate-500 text-sm mt-3 uppercase tracking-widest font-bold">
          Finalize your account setup
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Username</label>
          <div className="relative">
            <input
              type="text"
              placeholder="elder_guardian_01"
              className={`w-full auth-input-refined py-4 text-sm ${usernameStatus?.available === false ? 'border-red-500/50' : usernameStatus?.available === true ? 'border-emerald-500/50' : ''}`}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                onCheckUsername(e.target.value);
              }}
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {usernameStatus?.checking && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />}
              {usernameStatus?.available === true && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {usernameStatus?.available === false && <span className="text-[10px] font-bold text-red-400 uppercase">{usernameStatus.reason}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Set Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full auth-input-refined py-4 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-500 ml-5 opacity-80 tracking-wider">Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full auth-input-refined py-4 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSubmit}
          disabled={!!(loading || !username || (password && password !== confirmPassword))}
          className={`w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              Finish Setup
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        <div className="flex items-center justify-center gap-3 pt-4 opacity-30">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Your security is our priority</span>
        </div>
      </div>
    </div>
  );
};
