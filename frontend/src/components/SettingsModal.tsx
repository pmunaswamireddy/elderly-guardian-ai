import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Bell, Mic, Smartphone, Globe, Save, Volume2, Shield, Moon, Eye, Activity, Sparkles } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import { VOICE_DATA } from '../utils/voiceData';

interface UserSettings {
	name?: string;
	phone?: string;
	emergency_contact_name?: string;
	emergency_contact_phone?: string;
	preferred_language?: string;
	voice_enabled?: boolean;
	ai_enabled?: boolean;
	voice_reminders_enabled?: boolean;
	ai_language?: string;
	preferred_voice_uri?: string;
	ai_always_active?: boolean;
	ai_voice_model?: string;
	ai_voice_pitch?: number;
	ai_voice_clarity?: number;
	ai_voice_gender?: string;
	ai_voice_rate?: number;
	booking_language?: string;
	booking_voice_gender?: string;
	theme?: 'light' | 'dark';
	font_size_scale?: number;
	emergency_hold_duration?: number;
	magic_words_mappings?: Record<string, string>;
	inactivity_check_enabled?: boolean;
	inactivity_timeout_hours?: number;
	guardian_pin?: string;
	quiet_hours_enabled?: boolean;
	quiet_hours_start?: string;
	quiet_hours_end?: string;
	high_contrast?: boolean;
	ai_medical_strict_mode?: boolean;
}

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	userSettings: UserSettings;
	onSave: (s: Partial<UserSettings>) => void;
	isSimpleMode?: boolean;
	initialSection?: 'profile' | 'preferences';
	t?: (key: string) => string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userSettings, onSave, isSimpleMode, initialSection, t }) => {
	const [form, setForm] = useState<Partial<UserSettings>>({});
	const [activeSection, setActiveSection] = useState<'profile' | 'preferences'>('profile');
	const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

	// Initialize form only when modal opens
	useEffect(() => {
		if (isOpen) {
			setForm(userSettings || {});
			if (initialSection) {
				setActiveSection(initialSection);
			}
		}
	}, [isOpen]); // Removed userSettings to prevent loop

	useEffect(() => {
		const loadVoices = () => {
			const vs = window.speechSynthesis.getVoices();
			setVoices(vs);
		};
		loadVoices();
		window.speechSynthesis.onvoiceschanged = loadVoices;
		return () => { window.speechSynthesis.onvoiceschanged = null; };
	}, []);

	// Auto-save debouncer
	useEffect(() => {
		const timer = setTimeout(() => {
			// Deep-ish comparison to prevent saving if identical
			if (Object.keys(form).length > 0 && userSettings) {
				const isDiff = Object.keys(form).some(key => {
					// @ts-ignore
					// Use loose equality to handle 1 vs "1" scenarios from inputs
					return form[key] != userSettings[key];
				});

				if (isDiff) {
					console.log("Auto-saving due to changed keys:",
						Object.keys(form).filter(k =>
							// @ts-ignore
							form[k] != userSettings[k]
						)
					);
					onSave(form);
				}
			}
		}, 800);
		return () => clearTimeout(timer);
	}, [form]); // Removed onSave to prevent loops if onSave identity changes
	// Actually, if we use userSettings in the comparison, we should include it.
	// BUT, if userSettings updates, we don't want to trigger the effect IF form hasn't changed.
	// If userSettings updates, and form is same, isDiff becomes false. So onSave isn't called. Loop broken.


	const filteredVoices = voices.filter(v =>
		v.lang.startsWith((form.preferred_language || 'en').split('-')[0]) ||
		v.lang.startsWith('en') // Always offer English fallback
	);

	if (!isOpen) return null;

	const handleSave = () => {
		onSave(form);
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" style={{ perspective: '1000px' }}>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleSave} // Save on backdrop click too
						className="absolute inset-0 bg-black/60 backdrop-blur-sm"
					/>

					{/* Modal Content */}
					<motion.div
						initial={{ scale: 0.9, opacity: 0, rotateX: 10 }}
						animate={{ scale: 1, opacity: 1, rotateX: 0 }}
						exit={{ scale: 0.9, opacity: 0, rotateX: 10 }}
						transition={{ type: "spring", duration: 0.5 }}
						className="relative w-full max-w-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[600px]"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Sidebar (Desktop) / Topbar (Mobile) */}
						<div className="bg-sapphire-50/50 dark:bg-slate-950/50 p-6 md:w-64 border-b md:border-b-0 md:border-r border-white/20 flex flex-row md:flex-col gap-2 justify-between md:justify-start overflow-x-auto">
							<div>
								<h2 className="text-2xl font-bold bg-gradient-to-r from-sapphire-600 to-emerald-500 bg-clip-text text-transparent mb-1">{t ? t('Settings') : 'Settings'}</h2>
								<p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block mb-8">{t ? t('Personalize experience') : 'Personalize your experience'}</p>
							</div>

							<div className="flex flex-row md:flex-col gap-2">
								<button
									onClick={() => setActiveSection('profile')}
									className={`p-3 rounded-xl flex items-center gap-3 transition-all ${activeSection === 'profile' ? 'bg-white dark:bg-slate-800 shadow-lg text-sapphire-600 dark:text-sapphire-400' : 'hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
								>
									<User className="w-5 h-5" />
									<span className="font-semibold">{t ? t('Profile') : 'Profile'}</span>
								</button>
								<button
									onClick={() => setActiveSection('preferences')}
									className={`p-3 rounded-xl flex items-center gap-3 transition-all ${activeSection === 'preferences' ? 'bg-white dark:bg-slate-800 shadow-lg text-sapphire-600 dark:text-sapphire-400' : 'hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
								>
									<Bell className="w-5 h-5" />
									<span className="font-semibold">{t ? t('Preferences') : 'Preferences'}</span>
								</button>
							</div>
						</div>

						{/* Main Content */}
						<div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white/40 dark:bg-slate-900/40">
							<div className="flex justify-between items-center mb-6">
								<h3 className="text-xl font-bold text-slate-800 dark:text-white">
									{activeSection === 'profile' ? 'Profile Information' : 'App Preferences'}
								</h3>
								<button onClick={handleSave} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
									<X className="w-6 h-6 text-slate-400 dark:text-white" />
								</button>
							</div>

							<div className="space-y-6">
								{activeSection === 'profile' ? (
									<motion.div
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.3 }}
										className="space-y-4"
									>
										<div className="space-y-2">
											<label className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">Full Name</label>
											<div className="relative">
												<User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
												<input
													value={form.name || ''}
													onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
													className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-sapphire-500/20 focus:border-sapphire-500 outline-none transition-all dark:text-white dark:placeholder-slate-500"
													placeholder="John Doe"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<label className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">Phone Number</label>
											<div className="relative">
												<Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
												<input
													value={form.phone || ''}
													onChange={(e) => setForm(s => ({ ...s, phone: e.target.value }))}
													className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-sapphire-500/20 focus:border-sapphire-500 outline-none transition-all dark:text-white dark:placeholder-slate-500"
													placeholder="+1 234 567 890"
												/>
											</div>
										</div>

										<div className="pt-4 border-t border-slate-200">
											<h4 className="text-sm font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-4">Emergency Contact</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Contact Name</label>
													<input
														value={form.emergency_contact_name || ''}
														onChange={(e) => setForm(s => ({ ...s, emergency_contact_name: e.target.value }))}
														className="w-full px-4 py-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all dark:text-white"
														placeholder="Contact Name"
													/>
												</div>
												<div className="space-y-2">
													<label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Contact Phone</label>
													<input
														value={form.emergency_contact_phone || ''}
														onChange={(e) => setForm(s => ({ ...s, emergency_contact_phone: e.target.value }))}
														className="w-full px-4 py-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all dark:text-white"
														placeholder="Contact Phone"
													/>
												</div>
											</div>

											{/* Extended Emergency Settings */}
											<div className="mt-4 space-y-2">
												<div className="flex justify-between items-center">
													<label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">SOS Hold Duration (Safety)</label>
													<span className="text-xs text-red-500 font-bold">{form.emergency_hold_duration || 3}s</span>
												</div>
												<input
													type="range"
													min="0"
													max="5"
													step="1"
													value={form.emergency_hold_duration !== undefined ? form.emergency_hold_duration : 3}
													onChange={(e) => setForm(s => ({ ...s, emergency_hold_duration: parseInt(e.target.value) }))}
													className="w-full h-2 bg-red-100 dark:bg-red-900/40 rounded-lg appearance-none cursor-pointer accent-red-500"
												/>
												<div className="flex justify-between text-[10px] text-slate-400">
													<span>Instant (0s)</span>
													<span>Standard (3s)</span>
													<span>Long (5s)</span>
												</div>
												<p className="text-[10px] text-slate-400 italic">Hold the SOS button for this duration to trigger calls.</p>
											</div>

											{/* Magic Words Section */}
											<div className="mt-4 p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white dark:border-white/10">
												<div className="flex items-center gap-3 mb-4">
													<div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl">
														<Sparkles className="w-5 h-5" />
													</div>
													<div>
														<p className="font-bold text-slate-800 dark:text-white">Magic Words</p>
														<p className="text-xs text-slate-500 dark:text-slate-400">Map voice phrases to actions</p>
													</div>
												</div>

												<div className="space-y-2">
													{Object.entries(form.magic_words_mappings || {}).map(([phrase, action]) => (
														<div key={phrase} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
															<div>
																<p className="font-bold text-sm text-slate-700 dark:text-slate-300">"{phrase}"</p>
																<p className="text-[10px] uppercase font-bold text-purple-500">{action.replace('_', ' ')}</p>
															</div>
															<button
																onClick={() => {
																	const newMap = { ...form.magic_words_mappings };
																	delete newMap[phrase];
																	setForm(s => ({ ...s, magic_words_mappings: newMap }));
																}}
																className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
															>
																<X className="w-4 h-4" />
															</button>
														</div>
													))}

													<div className="flex gap-2 mt-2">
														<input
															type="text"
															placeholder="New Phrase (e.g. Red Protocol)"
															className="flex-1 px-3 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none dark:text-white"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const val = e.currentTarget.value.trim();
																	if (val) {
																		setForm(s => ({
																			...s,
																			magic_words_mappings: {
																				...s.magic_words_mappings,
																				[val]: 'silent_sos' // Default action, user can't select yet in this simple UI
																			}
																		}));
																		e.currentTarget.value = '';
																	}
																}
															}}
														/>
														<select
															className="px-2 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none dark:text-white"
															onChange={(e) => {
																const input = e.target.previousElementSibling as HTMLInputElement;
																const val = input.value.trim();
																if (val) {
																	setForm(s => ({
																		...s,
																		magic_words_mappings: {
																			...s.magic_words_mappings,
																			[val]: e.target.value
																		}
																	}));
																	input.value = '';
																	e.target.value = 'default';
																}
															}}
															defaultValue="default"
														>
															<option value="default" disabled>Add as...</option>
															<option value="silent_sos">Silent SOS</option>
															<option value="goodnight_protocol">Goodnight Mode</option>
															<option value="morning_protocol">Morning Mode</option>
														</select>
													</div>
												</div>
											</div>

											{/* Inactivity Monitor Section */}
											<div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
												<div className="flex items-center justify-between mb-2">
													<div className="flex items-center gap-3">
														<div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl">
															<Activity className="w-5 h-5" />
														</div>
														<div>
															<p className="font-bold text-slate-800 dark:text-white">Dead Man's Switch</p>
															<p className="text-xs text-slate-500 dark:text-slate-400">Auto-call SOS after inactivity</p>
														</div>
													</div>
													<ToggleSwitch
														isOn={!!form.inactivity_check_enabled}
														onToggle={() => setForm(s => ({ ...s, inactivity_check_enabled: !s.inactivity_check_enabled }))}
														color="bg-red-500"
													/>
												</div>

												<AnimatePresence>
													{form.inactivity_check_enabled && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: 'auto', opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															className="overflow-hidden"
														>
															<div className="px-4 pb-4 pt-2">
																<div className="flex justify-between items-center mb-2">
																	<label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Timeout Duration</label>
																	<span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg dark:text-white">
																		{form.inactivity_timeout_hours || 6} hours
																	</span>
																</div>
																<input
																	type="range"
																	min="1"
																	max="24"
																	step="1"
																	value={form.inactivity_timeout_hours || 6}
																	onChange={(e) => setForm(s => ({ ...s, inactivity_timeout_hours: parseInt(e.target.value) }))}
																	className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
																/>
																<p className="text-[10px] text-slate-400 italic mt-2">
																	If no movement is detected for this duration, key contacts will be alerted.
																</p>
															</div>
														</motion.div>
													)}
												</AnimatePresence>
											</div>

											{/* Guardian Security Section */}
											<div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
												<div className="flex justify-between items-center mb-4">
													<h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Guardian Security</h4>
													{form.guardian_pin && <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
												</div>
												<div className="space-y-2">
													<label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Guardian PIN (4 Digits)</label>
													<div className="relative">
														<Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
														<input
															type="password"
															maxLength={4}
															value={form.guardian_pin || ''}
															onChange={(e) => {
																const val = e.target.value.replace(/\D/g, '').slice(0, 4);
																setForm(s => ({ ...s, guardian_pin: val }));
															}}
															className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-sapphire-500/20 focus:border-sapphire-500 outline-none transition-all dark:text-white tracking-widest font-mono text-lg"
															placeholder="Set PIN to Lock Settings"
														/>
													</div>
													<p className="text-[10px] text-slate-400 italic ml-1">If set, this PIN will be required to access Settings.</p>
												</div>
											</div>
										</div>
									</motion.div>
								) : (
									<motion.div
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.3 }}
										className="space-y-6"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div className="space-y-2" id="language-section">
												<label className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">App UI Language</label>
												<div className="relative">
													<Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
													<select
														value={form.preferred_language || 'en'}
														onChange={(e) => setForm(s => ({ ...s, preferred_language: e.target.value }))}
														className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-sapphire-500/20 focus:border-sapphire-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
													>
														<option value="en">English (Default)</option>
														<option value="hi">Hindi (हिंदी)</option>
														<option value="ta">Tamil (தமிழ்)</option>
														<option value="te">Telugu (తెలుగు)</option>
														<option value="kn">Kannada (ಕನ್ನಡ)</option>
														<option value="ml">Malayalam (മലയാളം)</option>
														<option value="gu">Gujarati (ગુજરાતી)</option>
														<option value="bn">Bengali (বাংলা)</option>
														<option value="mr">Marathi (मराठी)</option>
														<option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
														<option value="ur">Urdu (اردو)</option>
														<option value="or">Odia (ଓଡ଼ିଆ)</option>
														<option value="bn">Bengali (বাংলা)</option>
														<option value="as">Assamese (অসমীয়া)</option>
														<option value="mai">Maithili (मैथिली)</option>
														<option value="sat">Santali (ᱥᱟᱱᱛᱟᱲᱤ)</option>
														<option value="ks">Kashmiri (کٲشُر)</option>
														<option value="ne">Nepali (नेपाली)</option>
														<option value="kok">Konkani (कोंकणी)</option>
														<option value="sd">Sindhi (سنڌي)</option>
														<option value="doi">Dogri (डोगरी)</option>
														<option value="mni">Manipuri (মণিপুরী)</option>
														<option value="brx">Bodo (बड़ो)</option>
														<option value="sa">Sanskrit (संस्कृतम्)</option>
													</select>
												</div>
											</div>

											<div className="space-y-2">
												<label className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">AI Assistant Language</label>
												<div className="relative">
													<Mic className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
													<select
														value={form.ai_language || form.preferred_language || 'en'}
														onChange={(e) => setForm(s => ({ ...s, ai_language: e.target.value }))}
														className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-sapphire-500/20 focus:border-sapphire-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
													>
														<option value="en">English (Default)</option>
														<option value="hi">Hindi (हिंदी)</option>
														<option value="ta">Tamil (தமிழ்)</option>
														<option value="te">Telugu (తెలుగు)</option>
														<option value="kn">Kannada (ಕನ್ನಡ)</option>
														<option value="ml">Malayalam (മലയാളം)</option>
														<option value="gu">Gujarati (ગુજરાતી)</option>
														<option value="bn">Bengali (বাংলা)</option>
														<option value="mr">Marathi (मराठी)</option>
														<option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
														<option value="ur">Urdu (اردو)</option>
														<option value="or">Odia (ଓଡ଼ିଆ)</option>
														<option value="as">Assamese (অসমীয়া)</option>
														<option value="mai">Maithili (मैथिली)</option>
														<option value="sat">Santali (ᱥᱟᱱᱛᱟᱲᱤ)</option>
														<option value="ks">Kashmiri (کٲشُر)</option>
														<option value="ne">Nepali (नेपाली)</option>
														<option value="kok">Konkani (कोंकणी)</option>
														<option value="sd">Sindhi (سنڌي)</option>
														<option value="doi">Dogri (डोगरी)</option>
														<option value="mni">Manipuri (মণিপুরী)</option>
														<option value="brx">Bodo (बड़ो)</option>
														<option value="sa">Sanskrit (संस्कृतम्)</option>
													</select>
												</div>
											</div>
										</div>

										{/* App Visuals - Theme & Font Size */}
										<div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white dark:border-white/10 space-y-4">
											<h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Visual Preferences</h4>

											<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
													<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">App Theme</label>
													<div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
														{['light', 'dark'].map(t => (
															<button
																key={t}
																onClick={() => setForm(s => ({ ...s, theme: t as any }))}
																className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${form.theme === t ? 'bg-white dark:bg-slate-700 shadow-sm text-sapphire-600 dark:text-indigo-400' : 'text-slate-400'}`}
															>
																{t}
															</button>
														))}
													</div>
												</div>

												<div className="space-y-2">
													<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Text Zoom</label>
													<input
														type="range"
														min="1.0"
														max="1.5"
														step="0.1"
														value={form.font_size_scale || 1.0}
														onChange={(e) => setForm(s => ({ ...s, font_size_scale: parseFloat(e.target.value) }))}
														className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sapphire-500"
													/>
													<div className="flex justify-between items-end mt-2 px-1">
														<span className="text-sm font-bold text-slate-400 dark:text-slate-500">Aa</span>
														<span className="text-xl font-bold text-slate-400 dark:text-slate-500">Aa</span>
													</div>
												</div>
											</div>
										</div>

										{/* Always Active AI Toggle - Available in both modes */}
										<div className={`rounded-2xl border border-white dark:border-white/10 transition-all duration-300 ${form.ai_always_active ? 'bg-emerald-50/50 dark:bg-emerald-900/30' : 'bg-white/60 dark:bg-slate-800/60'}`}>
											<div className="flex items-center justify-between p-4">
												<div className="flex items-center gap-3">
													<div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
														<Volume2 className="w-5 h-5" />
													</div>
													<div>
														<p className="font-bold text-slate-800 dark:text-white">Always Active AI</p>
														<p className="text-xs text-slate-500 dark:text-slate-400">Keep AI assistant continuously listening</p>
													</div>
												</div>
												<ToggleSwitch
													isOn={!!form.ai_always_active}
													onToggle={() => setForm(s => ({ ...s, ai_always_active: !s.ai_always_active }))}
													color="bg-emerald-500"
												/>
											</div>
										</div>

										{/* AI Voice Settings - Available in both modes */}
										<div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white dark:border-white/10 space-y-4">
											<div className="flex items-center gap-3 mb-3">
												<div className="p-2 bg-sapphire-100 dark:bg-sapphire-900/50 text-sapphire-600 dark:text-sapphire-400 rounded-xl">
													<Volume2 className="w-5 h-5" />
												</div>
												<div>
													<p className="font-bold text-slate-800 dark:text-white">AI Voice Settings</p>
													<p className="text-xs text-slate-500 dark:text-slate-400">Customize AI assistant voice quality</p>
												</div>
											</div>

											{/* Voice Model Selection */}
											<div className="space-y-2">
												<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Voice Model (Specific)</label>
												<select
													value={form.preferred_voice_uri || ''}
													onChange={(e) => {
														const selectedUri = e.target.value;
														// Prioritize AI language for voice matching
														const langCode = (form.ai_language || form.preferred_language || 'en').split('-')[0];
														const voiceInfo = VOICE_DATA[langCode]?.find(v => v.value === selectedUri);
														setForm(s => ({
															...s,
															preferred_voice_uri: selectedUri,
															// Auto-update gender if voice is known
															ai_voice_gender: voiceInfo ? voiceInfo.gender : s.ai_voice_gender
														}));
													}}
													className="w-full px-3 py-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-sapphire-500/20 outline-none cursor-pointer dark:text-white"
												>
													<option value="">Default (Auto-Select by Gender)</option>
													{(VOICE_DATA[(form.ai_language || form.preferred_language || 'en').split('-')[0]] || VOICE_DATA['en']).map(voice => (
														<option key={voice.value} value={voice.value}>
															{voice.name}
														</option>
													))}
												</select>
											</div>

											{/* Voice Pitch Control */}
											<div className="space-y-2">
												<div className="flex justify-between items-center">
													<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Voice Pitch</label>
													<span className="text-xs text-slate-500 dark:text-slate-400">{form.ai_voice_pitch || 1.0}</span>
												</div>
												<input
													type="range"
													min="0.5"
													max="2.0"
													step="0.1"
													value={form.ai_voice_pitch || 1.0}
													onChange={(e) => setForm(s => ({ ...s, ai_voice_pitch: parseFloat(e.target.value) }))}
													className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sapphire-500"
												/>
												<div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
													<span>Low</span>
													<span>Normal</span>
													<span>High</span>
												</div>
											</div>

											{/* Voice Clarity Control */}
											<div className="space-y-2">
												<div className="flex justify-between items-center">
													<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Voice Clarity</label>
													<span className="text-xs text-slate-500 dark:text-slate-400">{form.ai_voice_clarity || 1.0}</span>
												</div>
												<input
													type="range"
													min="0.5"
													max="2.0"
													step="0.1"
													value={form.ai_voice_clarity || 1.0}
													onChange={(e) => setForm(s => ({ ...s, ai_voice_clarity: parseFloat(e.target.value) }))}
													className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sapphire-500"
												/>
											</div>

											{/* Voice Speed Control - NEW */}
											<div className="space-y-2">
												<div className="flex justify-between items-center">
													<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Speaking Speed</label>
													<span className="text-xs text-slate-500 dark:text-slate-400">{form.ai_voice_rate || 1.0}x</span>
												</div>
												<input
													type="range"
													min="0.5"
													max="2.0"
													step="0.1"
													value={form.ai_voice_rate || 1.0}
													onChange={(e) => setForm(s => ({ ...s, ai_voice_rate: parseFloat(e.target.value) }))}
													className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sapphire-500"
												/>
											</div>

											{/* Voice Gender Selection - PREMIUM UPGRADE */}
											<div className="space-y-3 pt-2">
												<label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">AI Voice Gender</label>
												<div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl relative">
													{['Male', 'Female'].map(g => (
														<button
															key={g}
															type="button"
															onClick={() => setForm(s => ({ ...s, ai_voice_gender: g }))}
															className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all relative z-10 ${form.ai_voice_gender === g
																? 'text-white'
																: 'text-slate-500 hover:text-slate-700'
																}`}
														>
															{g === 'Male' ? <User className="w-4 h-4" /> : <User className="w-4 h-4" strokeWidth={3} />}
															{g}
														</button>
													))}
													{/* Sliding Background */}
													<motion.div
														layoutId="genderBackground"
														className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl shadow-lg z-0 ${form.ai_voice_gender === 'Male'
															? 'bg-gradient-to-r from-blue-600 to-indigo-600'
															: 'bg-gradient-to-r from-rose-500 to-pink-600'
															}`}
														initial={false}
														animate={{
															x: form.ai_voice_gender === 'Female' ? '100%' : '0%'
														}}
														transition={{ type: "spring", stiffness: 400, damping: 30 }}
													/>
												</div>
											</div>
										</div>

										{/* Visites AI (Voice Booking) Settings - Dedicated Section */}
										<div className="p-4 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-4">
											<div className="flex items-center gap-3 mb-1">
												<div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
													<Globe className="w-5 h-5" />
												</div>
												<div>
													<p className="font-bold text-slate-800 dark:text-white">Visites AI (Secondary Voice)</p>
													<p className="text-xs text-slate-500 dark:text-slate-400">Settings for appointment booking voice</p>
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Booking Language</label>
													<select
														value={form.booking_language || form.preferred_language || 'en'}
														onChange={(e) => setForm(s => ({ ...s, booking_language: e.target.value }))}
														className="w-full px-3 py-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer dark:text-white"
													>
														<option value="en">English (Default)</option>
														<option value="hi">Hindi (हिंदी)</option>
														<option value="ta">Tamil (தமிழ்)</option>
														<option value="te">Telugu (తెలుగు)</option>
														<option value="kn">Kannada (ಕನ್ನಡ)</option>
														<option value="ml">Malayalam (മലയാളം)</option>
														<option value="gu">Gujarati (ગુજરાતી)</option>
														<option value="bn">Bengali (বাংলা)</option>
														<option value="mr">Marathi (मराठी)</option>
														<option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
														<option value="ur">Urdu (اردو)</option>
														<option value="or">Odia (ଓଡ଼ିଆ)</option>
													</select>
												</div>

												<div className="space-y-2">
													<label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Booking Gender</label>
													<div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
														{['Male', 'Female'].map(g => (
															<button
																key={g}
																type="button"
																onClick={() => setForm(s => ({ ...s, booking_voice_gender: g }))}
																className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${form.booking_voice_gender === g ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
															>
																{g}
															</button>
														))}
													</div>
												</div>
											</div>
										</div>

										{!isSimpleMode && (
											<div className="space-y-4">
												{/* Voice Selection - NEW */}
												<div className="space-y-2">
													<label className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">Preferred Voice</label>
													<div className="relative">
														<Volume2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
														<select
															value={form.preferred_voice_uri || ''}
															onChange={(e) => setForm(s => ({ ...s, preferred_voice_uri: e.target.value }))}
															className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-sapphire-500/20 focus:border-sapphire-500 outline-none transition-all appearance-none cursor-pointer text-sm dark:text-white"
														>
															<option value="">Auto-Select Best Voice</option>
															{filteredVoices.map(v => (
																<option key={v.voiceURI} value={v.voiceURI}>
																	{v.name} ({v.lang})
																</option>
															))}
														</select>
													</div>
												</div>

												<div className="flex items-center justify-between p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white dark:border-white/10">
													<div className="flex items-center gap-3">
														<div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
															<Mic className="w-5 h-5" />
														</div>
														<div>
															<p className="font-bold text-slate-800 dark:text-white">Voice Navigation</p>
															<p className="text-xs text-slate-500 dark:text-slate-400">Enable voice commands throughout the app</p>
														</div>
													</div>
													<ToggleSwitch
														isOn={!!form.voice_enabled}
														onToggle={() => setForm(s => ({ ...s, voice_enabled: !s.voice_enabled }))}
														color="bg-emerald-500"
													/>
												</div>

												<div className={`rounded-2xl border border-white dark:border-white/10 transition-all duration-300 ${form.ai_enabled ? 'bg-sapphire-50/50 dark:bg-sapphire-900/20' : 'bg-white/60 dark:bg-slate-800/60'}`}>
													<div className="flex items-center justify-between p-4">
														<div className="flex items-center gap-3">
															<div className="p-2 bg-sapphire-100 dark:bg-sapphire-900/50 text-sapphire-600 dark:text-sapphire-400 rounded-xl">
																<motion.div
																	animate={{ rotate: form.ai_enabled ? 360 : 0 }}
																	transition={{ duration: 2, repeat: form.ai_enabled ? Infinity : 0, ease: "linear" }}
																>
																	<Globe className="w-5 h-5" />
																</motion.div>
															</div>
															<div>
																<p className="font-bold text-slate-800 dark:text-white">AI Assistant</p>
																<p className="text-xs text-slate-500 dark:text-slate-400">Enable Gemini-powered health insights</p>
															</div>
														</div>
														<ToggleSwitch
															isOn={!!form.ai_enabled}
															onToggle={() => setForm(s => ({ ...s, ai_enabled: !s.ai_enabled }))}
														/>
													</div>

													<AnimatePresence>
														{form.ai_enabled && (
															<motion.div
																initial={{ height: 0, opacity: 0 }}
																animate={{ height: 'auto', opacity: 1 }}
																exit={{ height: 0, opacity: 0 }}
																className="overflow-hidden"
															>
																<div className="px-4 pb-4 pt-0">
																	<div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/50 dark:border-slate-700/50 space-y-2">
																		<p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Quick Override</p>
																		<button
																			onClick={() => {
																				setActiveSection('preferences');
																				setTimeout(() => document.getElementById('language-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
																			}}
																			className="w-full py-2 bg-sapphire-600 text-white rounded-lg text-xs font-bold"
																		>
																			Go to Language Settings
																		</button>
																	</div>
																</div>
															</motion.div>
														)}
													</AnimatePresence>
												</div>

												<div className="flex items-center justify-between p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white dark:border-white/10">
													<div className="flex items-center gap-3">
														<div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl">
															<Bell className="w-5 h-5" />
														</div>
														<div>
															<p className="font-bold text-slate-800 dark:text-white">Voice Reminders</p>
															<p className="text-xs text-slate-500 dark:text-slate-400">Speak out loud when medicines are due</p>
														</div>
													</div>
													<ToggleSwitch
														isOn={!!form.voice_reminders_enabled}
														onToggle={() => setForm(s => ({ ...s, voice_reminders_enabled: !s.voice_reminders_enabled }))}
														color="bg-amber-500"
													/>
												</div>

												{/* Quiet Hours Section */}
												<div className={`rounded-2xl border border-white dark:border-white/10 transition-all duration-300 ${form.quiet_hours_enabled ? 'bg-indigo-50/50 dark:bg-indigo-900/30' : 'bg-white/60 dark:bg-slate-800/60'}`}>
													<div className="flex items-center justify-between p-4">
														<div className="flex items-center gap-3">
															<div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
																<Moon className="w-5 h-5" />
															</div>
															<div>
																<p className="font-bold text-slate-800 dark:text-white">Quiet Hours</p>
																<p className="text-xs text-slate-500 dark:text-slate-400">Silence voice during sleep</p>
															</div>
														</div>
														<ToggleSwitch
															isOn={!!form.quiet_hours_enabled}
															onToggle={() => setForm(s => ({ ...s, quiet_hours_enabled: !s.quiet_hours_enabled }))}
															color="bg-indigo-500"
														/>
													</div>

													<AnimatePresence>
														{form.quiet_hours_enabled && (
															<motion.div
																initial={{ height: 0, opacity: 0 }}
																animate={{ height: 'auto', opacity: 1 }}
																exit={{ height: 0, opacity: 0 }}
																className="overflow-hidden"
															>
																<div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-4">
																	<div className="space-y-1">
																		<label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Start Time</label>
																		<input
																			type="time"
																			value={form.quiet_hours_start || '22:00'}
																			onChange={(e) => setForm(s => ({ ...s, quiet_hours_start: e.target.value }))}
																			className="w-full px-3 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
																		/>
																	</div>
																	<div className="space-y-1">
																		<label className="text-[10px] font-bold uppercase text-slate-500 ml-1">End Time</label>
																		<input
																			type="time"
																			value={form.quiet_hours_end || '07:00'}
																			onChange={(e) => setForm(s => ({ ...s, quiet_hours_end: e.target.value }))}
																			className="w-full px-3 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
																		/>
																	</div>
																</div>
															</motion.div>
														)}
													</AnimatePresence>
												</div>

												{/* High Contrast Toggle */}
												<div className="flex items-center justify-between p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white dark:border-white/10 mt-4">
													<div className="flex items-center gap-3">
														<div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-xl">
															<Eye className="w-5 h-5" />
														</div>
														<div>
															<p className="font-bold text-slate-800 dark:text-white">High Contrast</p>
															<p className="text-xs text-slate-500 dark:text-slate-400">Yellow on Black for visibility</p>
														</div>
													</div>
													<ToggleSwitch
														isOn={!!form.high_contrast}
														onToggle={() => setForm(s => ({ ...s, high_contrast: !s.high_contrast }))}
														color="bg-yellow-500"
													/>
												</div>
											</div>
										)}
									</motion.div>
								)}
							</div>

							<div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 z-20 pb-2">
								<button
									onClick={onClose}
									className="px-6 py-3 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleSave}
									className="px-8 py-3 bg-gradient-to-r from-sapphire-600 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-sapphire-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
								>
									<Save className="w-5 h-5" />
									Save Changes
								</button>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

