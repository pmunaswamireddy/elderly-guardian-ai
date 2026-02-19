import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Hash, Settings, Plus, Gift, Smile, Search, Bell, BellOff, Users, Trash2, AlertTriangle, ShieldAlert, Reply, ArrowDown, Menu, Lock, Ban, Edit3, Calendar } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { cn } from '../utils/cn';

interface ChatMessage {
    id: number;
    user_id: number;
    user_name: string;
    message: string;
    timestamp: string;
    channel?: string;
    reply_to_id?: number;
    attachment_url?: string;
    attachment_type?: string;
    is_deleted?: number;
}

interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice';
    is_protected: boolean;
    read_only: boolean;
    whitelisted_users?: number[];
    last_message_at?: string; // New field from backend
    last_message_by?: number; // Sender ID of last message
}

interface ReportedUser {
    id: number;
    reporter_id: number;
    reporter_name: string;
    reported_id: number;
    reported_name: string;
    channel_id: number;
    channel_name: string;
    reason: string;
    timestamp: string;
}

interface CommunityUser {
    id: number;
    name: string;
    role: string;
    banned_until?: string;
    is_banned_in_channel?: boolean;
    channel_ban_reason?: string;
    avatar_url?: string;
}

interface DMConversation {
    user_id: number;
    name: string;
    role: string;
    avatar_url?: string;
    last_message_at: string;
    last_message?: string;
    unread_count: number;
}

interface DMMessage {
    id: number;
    sender_id: number;
    receiver_id: number;
    message: string;
    sender_name: string;
    sender_avatar?: string;
    attachment_url?: string;
    attachment_type?: string;
    read: number;
    timestamp: string;
    is_deleted?: number;
}

const CommunityChat: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<CommunityUser[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeChannel, setActiveChannel] = useState('general');
    const [isSending, setIsSending] = useState(false);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelReadOnly, setNewChannelReadOnly] = useState(false); // New state for creation
    const [editChannel, setEditChannel] = useState<Channel | null>(null); // New state for editing
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'user' | 'message' | 'channel', data: any } | null>(null);

    // Direct Messages State
    const [viewMode, setViewMode] = useState<'channels' | 'dms'>('channels');
    const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
    const [activeDM, setActiveDM] = useState<DMConversation | null>(null);
    const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
    const [blockedByMe, setBlockedByMe] = useState<number[]>([]); // List of IDs I blocked
    const [isCurrentDMBlocked, setIsCurrentDMBlocked] = useState(false); // If the current DM pair is blocked

    // Channel Roles State
    const [showChannelSettings, setShowChannelSettings] = useState(false);
    const [channelRoles, setChannelRoles] = useState<{ user_id: number, role: string, user_name: string }[]>([]);
    const [myChannelRole, setMyChannelRole] = useState<string | null>(null);

    // Theme Sync (Use global theme instead of local state)
    const isDarkMode = currentUser?.theme === 'dark';

    // Unread Tracking
    const [lastVisitedChannels, setLastVisitedChannels] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('lastVisitedChannels');
        return saved ? JSON.parse(saved) : {};
    });

    const handleBanUser = (userId: number) => {
        const user = onlineUsers.find(u => u.id === userId) || reports.find(r => r.reported_id === userId);
        if (!user) return;
        // @ts-ignore
        setBanCandidate(user.reporter_name ? { id: user.reported_id, name: user.reported_name } : user);
        setShowBanModal(true);
        setShowReportsList(false); // Close reports if open
    };

    const confirmBan = async () => {
        if (!banCandidate) return;
        try {
            if (isGlobalBan) {
                await fetch(`${API_BASE_URL}/admin/users/${banCandidate.id}/ban`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reason: banReason || 'Violating community guidelines',
                        banned_by: currentUser.id
                    })
                });
                showToast(`User ${banCandidate.name} has been globally banned.`, 'success');
            } else {
                await fetch(`${API_BASE_URL}/api/channels/${activeChannel}/ban`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: banCandidate.id,
                        reason: banReason || 'Violating channel rules',
                        banned_by: currentUser.id
                    })
                });
                showToast(`User ${banCandidate.name} banned from #${currentChannelObj?.name}`, 'success');
            }
            setShowBanModal(false);
            setBanCandidate(null);
            setBanReason('');
            fetchUsers();
            fetchBannedChannels();
        } catch (e) {
            console.error("Ban Error:", e);
            showToast("Failed to ban user. Please try again.", 'error');
        }
    };
    // Icon States
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGiftPicker, setShowGiftPicker] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [lastPlayedMessageId, setLastPlayedMessageId] = useState<number | null>(null);

    const playNotificationSound = () => {
        if (isMuted) return;
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Sound play error:", e));
    };

    // Whitelist Search State
    const [whitelistSearch, setWhitelistSearch] = useState('');
    const lastDMTimestampRef = useRef<string>(new Date().toISOString());
    const audioRef = useRef<HTMLAudioElement>(new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"));

    // New Features Query State
    const [searchQuery, setSearchQuery] = useState('');
    const [showServerSettings, setShowServerSettings] = useState(false);
    const [showMobileMembers, setShowMobileMembers] = useState(false);

    // Admin Feature States
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [showRoleManager, setShowRoleManager] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showReportsList, setShowReportsList] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportingUser, setReportingUser] = useState<CommunityUser | null>(null); // User being reported
    const [reports, setReports] = useState<ReportedUser[]>([]);

    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Ban Logic
    const [showBanModal, setShowBanModal] = useState(false);
    const [banCandidate, setBanCandidate] = useState<CommunityUser | null>(null);
    const [banReason, setBanReason] = useState('');
    const [isGlobalBan, setIsGlobalBan] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [bannedChannels, setBannedChannels] = useState<Record<string, string>>({});
    const [userBanStatus, setUserBanStatus] = useState<{ banned_until?: string, ban_reason?: string, avatar_url?: string }>({});

    // Avatar System
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const presetAvatars = [
        // Medical Professionals
        { id: 'doctor_male', url: '/avatars/doctor_male.png', label: 'Doctor (M)', category: 'Medical' },
        { id: 'doctor_female', url: '/avatars/doctor_female.png', label: 'Doctor (F)', category: 'Medical' },
        { id: 'nurse_male', url: '/avatars/nurse_male.png', label: 'Nurse (M)', category: 'Medical' },
        { id: 'nurse_female', url: '/avatars/nurse_female.png', label: 'Nurse (F)', category: 'Medical' },
        { id: 'surgeon', url: '/avatars/surgeon.png', label: 'Surgeon', category: 'Medical' },
        { id: 'pharmacist', url: '/avatars/pharmacist.png', label: 'Pharmacist', category: 'Medical' },
        { id: 'dentist', url: '/avatars/dentist.png', label: 'Dentist', category: 'Medical' },
        { id: 'paramedic', url: '/avatars/paramedic.png', label: 'Paramedic', category: 'Medical' },
        { id: 'lab_technician', url: '/avatars/lab_technician.png', label: 'Lab Tech', category: 'Medical' },
        { id: 'therapist', url: '/avatars/therapist.png', label: 'Therapist', category: 'Medical' },
        // Wellness
        { id: 'caregiver', url: '/avatars/caregiver.png', label: 'Caregiver', category: 'Wellness' },
        { id: 'nutritionist', url: '/avatars/nutritionist.png', label: 'Nutritionist', category: 'Wellness' },
        { id: 'yoga_instructor', url: '/avatars/yoga_instructor.png', label: 'Yoga', category: 'Wellness' },
        { id: 'receptionist', url: '/avatars/receptionist.png', label: 'Receptionist', category: 'Wellness' },
        // People
        { id: 'adult_man', url: '/avatars/adult_man.png', label: 'Adult (M)', category: 'People' },
        { id: 'adult_woman', url: '/avatars/adult_woman.png', label: 'Adult (F)', category: 'People' },
        { id: 'elderly_man', url: '/avatars/elderly_man.png', label: 'Senior (M)', category: 'People' },
        { id: 'elderly_woman', url: '/avatars/elderly_woman.png', label: 'Senior (F)', category: 'People' },
        { id: 'teenager_boy', url: '/avatars/teenager_boy.png', label: 'Teen (M)', category: 'People' },
        { id: 'teenager_girl', url: '/avatars/teenager_girl.png', label: 'Teen (F)', category: 'People' },
        // Fallback for missing child avatars - using API temporarily
        { id: 'child_boy', url: 'https://ui-avatars.com/api/?name=Boy&background=38bdf8&color=fff&size=128&bold=true', label: 'Child (M)', category: 'People' },
        { id: 'child_girl', url: 'https://ui-avatars.com/api/?name=Girl&background=fb7185&color=fff&size=128&bold=true', label: 'Child (F)', category: 'People' },
    ];

    // Custom UI States (Replacing alert/confirm)
    const [toast, setToast] = useState<{ message: string, type: 'info' | 'error' | 'success' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);

    const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const askConfirm = (message: string, onConfirm: () => void) => {
        setConfirmModal({ message, onConfirm });
    };

    // Permission Logic
    const role = currentUser?.role?.toLowerCase() || 'user';
    const isAdmin = role === 'admin' || currentUser?.name === 'Admin';
    const isModerator = role === 'moderator';
    const isStaff = isAdmin || isModerator;

    // Permission Logic
    // Permission Logic
    const currentChannelObj = channels.find(c => c.id === activeChannel);
    // Explicitly cast to ensure type safety between string/number mismatches
    const currentUserId = Number(currentUser?.id || 0);
    const isChannelReadOnly = currentChannelObj?.read_only === true;
    const isUserWhitelisted = currentChannelObj?.whitelisted_users?.map(Number).includes(currentUserId);
    const isBannedFromChannel = !!bannedChannels[activeChannel];
    const isGloballyBanned = !!userBanStatus?.banned_until || !!currentUser?.banned_until;
    const globalBanReason = userBanStatus?.ban_reason || currentUser?.ban_reason || 'Violating community guidelines';
    const canChat = (isAdmin || !isChannelReadOnly || isUserWhitelisted) && !isBannedFromChannel && !isGloballyBanned;

    // Debug Permissions (Optional: Remove in prod, helpful for hackathon)
    // console.log("Perms:", { isAdmin, isChannelReadOnly, isUserWhitelisted, canChat, chId: activeChannel });

    // Track last message timestamp per channel to trigger sounds globally
    const channelTimestampsRef = useRef<Record<string, string>>({});

    const fetchChannels = () => {
        return fetch(`${API_BASE_URL}/api/channels`)
            .then(res => res.json())
            .then(data => {
                const newChannels = data.channels || [];

                // Check if any channel has a new message to play sound
                let shouldPlaySound = false;
                newChannels.forEach((ch: Channel) => {
                    if (ch.last_message_at) {
                        const prev = channelTimestampsRef.current[ch.id];
                        if (prev && ch.last_message_at > prev) {
                            // New message detected!
                            // Only play sound if NOT sent by current user
                            // Ensure strict numeric comparison to avoid string/number mismatch
                            // DEBUG LOGGING
                            console.log(`Sound Check - Channel: ${ch.name}, LastMsgBy: ${ch.last_message_by} (${typeof ch.last_message_by}), MyId: ${currentUser?.id} (${typeof currentUser?.id})`);

                            if (Number(ch.last_message_by) !== Number(currentUser?.id)) {
                                console.log("Can Play Sound: TRUE (Mismatch)");
                                shouldPlaySound = true;
                            } else {
                                console.log("Can Play Sound: FALSE (Self Message)");
                            }
                        }
                        channelTimestampsRef.current[ch.id] = ch.last_message_at;
                    }
                });

                if (shouldPlaySound && !isMuted) {
                    audioRef.current.play().catch(e => console.log("Audio play blocked:", e));
                }

                setChannels(newChannels);
                return data;
            })
            .catch(err => console.error("Channel Error:", err));
    };

    const fetchChannelRoles = async (channelId: string) => {
        if (!currentUser) return;
        try {
            const [rolesRes, myRoleRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/channels/${channelId}/roles`),
                fetch(`${API_BASE_URL}/api/channels/${channelId}/roles/${currentUser.id}`)
            ]);
            const rolesData = await rolesRes.json();
            const myRoleData = await myRoleRes.json();
            setChannelRoles(rolesData.roles || []);
            setMyChannelRole(myRoleData.role);
        } catch (err) {
            console.error("Role fetch error:", err);
        }
    };

    const assignRole = async (userId: number, role: string) => {
        if (!currentUser) return;
        await fetch(`${API_BASE_URL}/api/channels/${activeChannel}/roles?requester_id=${currentUser.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, role })
        });
        fetchChannelRoles(activeChannel);
    };

    const removeRole = async (userId: number) => {
        if (!currentUser) return;
        await fetch(`${API_BASE_URL}/api/channels/${activeChannel}/roles/${userId}?requester_id=${currentUser.id}`, {
            method: 'DELETE'
        });
        fetchChannelRoles(activeChannel);
    };

    const fetchUsers = () => {
        fetch(`${API_BASE_URL}/api/users?channel_id=${activeChannel}`)
            .then(res => res.json())
            .then(data => setOnlineUsers(data.users || []))
            .catch(err => console.error("Users Error:", err));
    };

    const fetchAuditLogs = () => {
        fetch(`${API_BASE_URL}/api/audit-logs`)
            .then(res => res.json())
            .then(data => setAuditLogs(data.logs || []));
    };

    const fetchBannedChannels = () => {
        if (!currentUser) return;
        fetch(`${API_BASE_URL}/api/users/${currentUser.id}/channel-bans`)
            .then(res => res.json())
            .then(data => setBannedChannels(data.banned_channels || {}));
    };

    const fetchUserBanStatus = () => {
        if (!currentUser) return;
        fetch(`${API_BASE_URL}/api/users/${currentUser.id}/status`)
            .then(res => res.json())
            .then(data => setUserBanStatus({ banned_until: data.banned_until, ban_reason: data.ban_reason, avatar_url: data.avatar_url }))
            .catch(err => console.error("Ban status fetch error:", err));
    };

    const handleAvatarSelect = async (avatarUrl: string) => {
        if (!currentUser) return;
        try {
            await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/avatar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar_url: avatarUrl })
            });
            setUserBanStatus(prev => ({ ...prev, avatar_url: avatarUrl }));
            setShowAvatarModal(false);
            showToast('Avatar updated!', 'success');
            fetchUsers();
        } catch (e) {
            showToast('Failed to update avatar', 'error');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('Image must be less than 2MB', 'error');
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();

            if (uploadData.url) {
                await handleAvatarSelect(uploadData.url);
            }
        } catch (e) {
            showToast('Failed to upload avatar', 'error');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } });
            streamRef.current = stream;
            setShowCamera(true);
            // Attach stream after state update - use setTimeout to wait for render
            setTimeout(() => {
                if (videoRef.current && streamRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);
        } catch (e) {
            console.error('Camera error:', e);
            showToast('Camera access denied or unavailable', 'error');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current || !currentUser) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw circular crop
        ctx.beginPath();
        ctx.arc(150, 150, 150, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(video, 0, 0, 300, 300);

        stopCamera();
        setIsUploadingAvatar(true);

        try {
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(), 'image/png', 0.9);
            });

            const formData = new FormData();
            formData.append('file', blob, 'camera_avatar.png');
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();

            if (uploadData.url) {
                await handleAvatarSelect(uploadData.url);
            }
        } catch (e) {
            showToast('Failed to save photo', 'error');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // =====================
    // DIRECT MESSAGES FUNCTIONS
    // =====================

    const fetchDMConversations = () => {
        if (!currentUser) return;
        fetch(`${API_BASE_URL}/api/dm/conversations/${currentUser.id}`)
            .then(res => res.json())
            .then(data => {
                const convs = data.conversations || [];
                setDmConversations(convs);

                // Global DM notification check
                let hasNewDM = false;
                convs.forEach((c: DMConversation) => {
                    if (c.last_message_at && c.last_message_at > lastDMTimestampRef.current) {
                        // Check if the sender is not us (we don't get notifications for our own messages sent from other devices for now)
                        // Note: In a real app, you might want to check sender_id, but conversations endpoint might not have it directly.
                        // Assuming last_message_at update implies an incoming message or our own.
                        // For hackathon simplicity, any update to a conversation we are NOT actively looking at (or any update) plays sound.
                        if (!activeDM || activeDM.user_id !== c.user_id) {
                            hasNewDM = true;
                        }
                        lastDMTimestampRef.current = c.last_message_at > lastDMTimestampRef.current ? c.last_message_at : lastDMTimestampRef.current;
                    }
                });

                if (hasNewDM && !isMuted) playNotificationSound();
            })
            .catch(err => console.error("DM fetch error:", err));
    };

    const fetchDMHistory = (otherUserId: number) => {
        if (!currentUser) return;
        fetch(`${API_BASE_URL}/api/dm/${currentUser.id}/messages/${otherUserId}`)
            .then(res => res.json())
            .then(data => {
                const msgs = data.messages || [];
                if (msgs.length > 0) {
                    const lastMsg = msgs[msgs.length - 1];
                    if (lastMsg.id !== lastPlayedMessageId && lastMsg.sender_id !== currentUser.id) {
                        setLastPlayedMessageId(lastMsg.id);
                        // Global logic handles sound now, but we keep this as fallback for the active window
                        // if (!isMuted) playNotificationSound(); 
                    }
                }
                setDmMessages(msgs);
            })
            .catch(err => console.error("DM history error:", err));
    };

    const checkBlockStatus = async (otherId: number) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/dm/${currentUser.id}/is-blocked/${otherId}`);
            const data = await res.json();
            setIsCurrentDMBlocked(data.blocked);
        } catch (e) {
            console.error("Block check error:", e);
        }
    };

    const fetchBlockedUsers = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/dm/${currentUser.id}/blocks`);
            const data = await res.json();
            setBlockedByMe(data.blocked_ids || []);
        } catch (e) {
            console.error("Fetch blocks error:", e);
        }
    };

    const handleBlockUser = async (targetId: number) => {
        if (!currentUser) return;
        try {
            await fetch(`${API_BASE_URL}/api/dm/${currentUser.id}/block/${targetId}`, { method: 'POST' });
            showToast('User blocked', 'success');
            fetchBlockedUsers();
            if (activeDM?.user_id === targetId) checkBlockStatus(targetId);
        } catch (e) {
            showToast('Failed to block user', 'error');
        }
    };

    const handleUnblockUserDM = async (targetId: number) => {
        if (!currentUser) return;
        try {
            await fetch(`${API_BASE_URL}/api/dm/${currentUser.id}/block/${targetId}`, { method: 'DELETE' });
            showToast('User unblocked', 'success');
            fetchBlockedUsers();
            if (activeDM?.user_id === targetId) checkBlockStatus(targetId);
        } catch (e) {
            showToast('Failed to unblock user', 'error');
        }
    };

    const sendDMMessage = async (receiverId: number, message: string, attachmentUrl?: string, attachmentType?: string) => {
        if (!currentUser || (!message.trim() && !attachmentUrl)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/dm/${currentUser.id}/send/${receiverId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message || (attachmentUrl ? 'Sent an attachment' : ''),
                    attachment_url: attachmentUrl,
                    attachment_type: attachmentType
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchDMHistory(receiverId);
                fetchDMConversations();
                return true;
            } else {
                showToast(data.error || 'Failed to send DM', 'error');
                return false;
            }
        } catch (e) {
            showToast('Failed to send DM', 'error');
            return false;
        }
    };

    const handleClearDMHistory = (otherId: number) => {
        if (!currentUser) return;
        setContextMenu(null); // Close menu immediately

        askConfirm("Are you sure you want to clear this entire conversation? This cannot be undone.", () => {
            fetch(`${API_BASE_URL}/api/dm/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, other_id: otherId })
            })
                .then(async res => {
                    const data = await res.json().catch(() => ({ success: false, error: "Server returned non-JSON response" }));
                    if (res.ok && data.success) {
                        showToast("Conversation cleared", 'success');
                        setDmMessages([]); // UI IMMEDIATE REFRESH
                        fetchDMHistory(otherId);
                        fetchDMConversations();
                    } else {
                        showToast(data.error || `Clear failed (${res.status})`, 'error');
                    }
                })
                .catch(err => {
                    console.error("Clear DM Error:", err);
                    showToast("Network error or server unavailable", 'error');
                });
        });
    };

    const openDM = (user: CommunityUser | DMConversation) => {
        const userId = 'id' in user ? user.id : (user as DMConversation).user_id;
        const dmUser: DMConversation = {
            user_id: userId,
            name: user.name,
            role: user.role,
            avatar_url: user.avatar_url,
            last_message_at: (user as DMConversation).last_message_at || new Date().toISOString(),
            unread_count: (user as DMConversation).unread_count || 0
        };
        setActiveDM(dmUser);
        setViewMode('dms');
        fetchDMHistory(dmUser.user_id);
        checkBlockStatus(dmUser.user_id);
        setContextMenu(null);
    };


    const fetchHistory = () => {
        fetch(`${API_BASE_URL}/api/chat/history?channel=${activeChannel}`)
            .then(res => res.json())
            .then(data => {
                const msgs = data.history || [];
                const currentIds = messages.map(m => m.id).join(',');
                const newIds = msgs.map((m: ChatMessage) => m.id).join(',');

                if (msgs.length !== messages.length || newIds !== currentIds) {
                    if (msgs.length > 0) {
                        const lastMsg = msgs[msgs.length - 1];
                        if (lastMsg.id !== lastPlayedMessageId && lastMsg.user_id !== currentUser?.id) {
                            setLastPlayedMessageId(lastMsg.id);
                            playNotificationSound();
                        }
                    }
                    setMessages(msgs);
                } else {
                    if (JSON.stringify(msgs) !== JSON.stringify(messages)) {
                        setMessages(msgs);
                    }
                }
            })
            .catch(err => console.error("Chat History Error:", err));
    };

    useEffect(() => {
        fetchChannels();
        fetchUsers();
        fetchUserBanStatus();
        fetchBlockedUsers();
    }, []);

    useEffect(() => {
        // Update read status for current channel immediately on switch/poll
        if (activeChannel) {
            setLastVisitedChannels(prev => {
                const now = new Date().toISOString();
                const updated = { ...prev, [activeChannel]: now };
                localStorage.setItem('lastVisitedChannels', JSON.stringify(updated));
                return updated;
            });
        }

        const poll = () => {
            const isDM = viewMode === 'dms';

            if (isDM) {
                if (activeDM) {
                    fetchDMHistory(activeDM.user_id);
                    checkBlockStatus(activeDM.user_id);
                }
            } else {
                if (activeChannel) fetchHistory();
                fetchBannedChannels(); // Poll bans only relevant in channel mode
            }

            fetchChannels(); // Always poll for sidebar
            fetchUsers();
            fetchUserBanStatus();
            fetchDMConversations(); // Always poll for unread markers
            fetchBlockedUsers();
        }
        poll();
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [activeChannel, activeDM, viewMode, messages, isMuted, currentUser]);

    const initialLoadRef = useRef(true);

    useEffect(() => {
        // Reset initial load state when channel changes
        initialLoadRef.current = true;
    }, [activeChannel]);

    // Camera stream sync - attach stream when video element is rendered
    useEffect(() => {
        if (showCamera && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(console.error);
        }
    }, [showCamera]);

    useEffect(() => {
        if (scrollRef.current && messages.length > 0) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

            // Force scroll to bottom on initial channel load OR if user is already near bottom
            if (initialLoadRef.current || isNearBottom) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: initialLoadRef.current ? 'instant' : 'smooth'
                });
                initialLoadRef.current = false;
            }
        }
    }, [messages]);

    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

    // Focus input when editing
    useEffect(() => {
        if (editingMessage || replyTo) {
            const input = document.querySelector('input[placeholder^="Message"]');
            if (input instanceof HTMLInputElement) input.focus();
        }
    }, [editingMessage, replyTo]);

    const handleSend = async (e?: React.FormEvent, attachmentUrl?: string, attachmentType?: string) => {
        if (e) e.preventDefault();

        const msgText = newMessage.trim();
        if ((!msgText && !attachmentUrl) || isSending || !currentUser) return;

        setIsSending(true);
        try {
            const isDM = viewMode === 'dms';

            // Handle Editing
            if (editingMessage) {
                const endpoint = isDM
                    ? `${API_BASE_URL}/api/dm/message/${editingMessage.id}`
                    : `${API_BASE_URL}/api/chat/message/${editingMessage.id}`;

                const res = await fetch(endpoint, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: msgText,
                        user_id: currentUser.id
                    })
                });
                if (res.ok) {
                    setEditingMessage(null);
                    setNewMessage('');
                    if (isDM && activeDM) fetchDMHistory(activeDM.user_id);
                    else fetchHistory();
                    showToast('Message edited successfully!', 'success');
                } else {
                    const errData = await res.json().catch(() => ({}));
                    showToast(errData.detail || 'Failed to edit message', 'error');
                }
                setIsSending(false);
                return;
            }

            // DM Mode - New Message
            if (isDM && activeDM) {
                const success = await sendDMMessage(activeDM.user_id, msgText, attachmentUrl, attachmentType);
                if (success) {
                    setNewMessage('');
                    setReplyTo(null);
                }
                setIsSending(false);
                return;
            }

            // Channel Mode - New Message
            const res = await fetch(`${API_BASE_URL}/api/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    message: msgText || (attachmentUrl ? 'Sent an attachment' : ''),
                    channel: activeChannel,
                    reply_to_id: replyTo?.id,
                    attachment_url: attachmentUrl,
                    attachment_type: attachmentType
                })
            });

            if (res.ok) {
                setNewMessage('');
                setReplyTo(null);
                fetchHistory();
            } else {
                if (res.status === 403) {
                    showToast("Access Denied: You cannot post here.", 'error');
                } else {
                    showToast("Failed to send message.", 'error');
                }
            }
        } catch (error) {
            console.error('Send error:', error);
            showToast("Failed to send message", 'error');
        } finally {
            setIsSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const fetchReports = () => {
        if (!isStaff) return;
        fetch(`${API_BASE_URL}/admin/reports`).then(res => res.json()).then(data => setReports(data.reports || []));
    };

    const submitReport = async () => {
        if (!reportingUser || !reportReason.trim() || !currentUser) return;
        try {
            await fetch(`${API_BASE_URL}/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporter_id: currentUser.id,
                    reported_id: reportingUser.id,
                    channel_id: activeChannel, // Context is important
                    reason: reportReason
                })
            });
            setShowReportModal(false);
            setReportReason('');
            setReportingUser(null);
            showToast("Report submitted successfully.", 'success');
        } catch (e) {
            console.error("Report Error:", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsSending(true);
            const res = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.url) {
                // Send immediately as a message
                await handleSend(undefined, data.url, data.type);
            }
        } catch (error) {
            console.error("Upload Error:", error);
            showToast("Failed to upload file.", 'error');
        } finally {
            setIsSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateChannel = () => {
        if (!newChannelName.trim()) return;

        if (editChannel) {
            // Update mode
            fetch(`${API_BASE_URL}/api/channels/${editChannel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newChannelName, read_only: newChannelReadOnly })
            }).then(() => {
                setShowCreateChannel(false);
                setNewChannelName('');
                setNewChannelReadOnly(false);
                setEditChannel(null);
                fetchChannels();
            });
        } else {
            // Create mode
            const id = newChannelName.toLowerCase().replace(/\s+/g, '-');
            fetch(`${API_BASE_URL}/api/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: newChannelName, read_only: newChannelReadOnly })
            }).then(() => {
                setShowCreateChannel(false);
                setNewChannelName('');
                setNewChannelReadOnly(false);
                fetchChannels();
            });
        }
    };

    const handleDeleteChannel = (channelId: string) => {
        askConfirm("Are you sure you want to delete this channel? Messages will be lost (hidden).", () => {
            fetch(`${API_BASE_URL}/api/channels/${channelId}`, { method: 'DELETE' })
                .then(() => {
                    fetchChannels();
                    if (activeChannel === channelId) setActiveChannel('general');
                    showToast("Channel deleted.", 'success');
                });
        });
        setContextMenu(null);
    };

    const handleDeleteMessage = (msgId: number) => {
        const isDM = viewMode === 'dms';
        const url = isDM
            ? `${API_BASE_URL}/api/dm/message/${msgId}`
            : `${API_BASE_URL}/api/chat/message/${msgId}`;

        fetch(url, { method: 'DELETE' })
            .then(() => {
                if (isDM && activeDM) fetchDMHistory(activeDM.user_id);
                else fetchHistory();
            });
        setContextMenu(null);
    };

    const handleClearChat = (channelId: string) => {
        askConfirm("Are you sure you want to PERMANENTLY delete ALL messages in this channel? This cannot be undone.", () => {
            fetch(`${API_BASE_URL}/api/channels/${channelId}/messages`, { method: 'DELETE' })
                .then(() => {
                    showToast("Chat history cleared.", 'success');
                    if (activeChannel === channelId) fetchHistory();
                });
        });
        setContextMenu(null);
    };

    // Old handleBanUser removed in favor of modal

    const handleReportUser = (userId: number) => {
        const targetUser = onlineUsers.find(u => u.id === userId);
        if (targetUser) {
            setReportingUser(targetUser);
            setShowReportModal(true);
        }
        setContextMenu(null);
    };

    const handleReportMessage = async (msgId: number, reason: string) => {
        if (!currentUser) return;
        const isDM = viewMode === 'dms';
        const url = isDM
            ? `${API_BASE_URL}/api/dm/message/${msgId}/report`
            : `${API_BASE_URL}/api/reports`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporter_id: currentUser.id,
                    message_id: msgId,
                    reason: reason
                })
            });
            showToast("Report submitted.", 'success');
        } catch (e) {
            showToast("Failed to submit report.", 'error');
        }
        setContextMenu(null);
    };

    const handleUnbanUser = async (userId: number, fromChannel: boolean = false) => {
        const user = onlineUsers.find(u => u.id === userId);
        const name = user?.name || `User ${userId}`;

        if (fromChannel) {
            askConfirm(`Unban ${name} from #${currentChannelObj?.name}?`, async () => {
                await fetch(`${API_BASE_URL}/api/channels/${activeChannel}/ban/${userId}`, { method: 'DELETE' });
                showToast(`${name} unbanned from channel.`, 'success');
                fetchUsers();
                fetchBannedChannels();
            });
        } else {
            askConfirm(`Remove GLOBAL ban for ${name}?`, async () => {
                await fetch(`${API_BASE_URL}/admin/users/${userId}/unban`, { method: 'POST' });
                showToast(`${name} unbanned globally.`, 'success');
                fetchUsers();
                fetchBannedChannels();
            });
        }
        setContextMenu(null);
    };

    const handleContextMenu = (e: React.MouseEvent, type: 'user' | 'message' | 'channel', data: any) => {
        e.preventDefault();
        e.stopPropagation();

        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 208; // w-52 = 13rem = 208px
        const menuHeight = 300; // Approximated height (increased for safety)

        // Ensure menu stays within viewport bounds
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        if (x < 10) x = 10;

        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }
        if (y < 10) y = 10;

        setContextMenu({ x, y, type, data });
    };

    // Close context menu on click elsewhere
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    // Mobile Sidebar State
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Scroll to message
    const scrollToMessage = (messageId: number) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // "Thick" Highlight: Stronger border and background
            element.classList.remove('transition-colors', 'duration-500'); // Reset
            element.classList.add('bg-sapphire-100', 'border-l-4', 'border-sapphire-600', 'transition-all', 'duration-1000');
            setTimeout(() => {
                element.classList.remove('bg-sapphire-100', 'border-l-4', 'border-sapphire-600');
            }, 2500);
        }
    };

    return (
        <div className={cn(
            "flex h-[82vh] w-full md:rounded-[2rem] overflow-hidden shadow-2xl border font-sans relative transition-all z-10",
            isDarkMode
                ? "bg-slate-900/95 border-slate-700/50 text-white"
                : "bg-white/10 border-white/20"
        )} style={{ backdropFilter: 'blur(80px)', WebkitBackdropFilter: 'blur(80px)' }}>

            {/* Context Menu - Rendered at document level with high z-index */}
            {contextMenu && (
                <div
                    className="fixed bg-slate-900/95 text-white p-1 rounded-2xl shadow-2xl w-52 py-2 space-y-1 border border-white/20"
                    style={{
                        top: contextMenu.y,
                        left: contextMenu.x,
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        zIndex: 99999,
                        position: 'fixed'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {contextMenu.type === 'message' && (
                        <>
                            <button onClick={() => setReplyTo(contextMenu.data)} className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                <Reply className="w-4 h-4" /> Reply
                            </button>

                            {/* Allow Edit for Message Owner within 1 hour - NO ADMIS of other users' DMs */}
                            {(() => {
                                const msg = contextMenu.data;
                                const msgAuthorId = msg.sender_id ?? msg.user_id;
                                const isOwner = Number(msgAuthorId) === Number(currentUser?.id);

                                // Robust UTC parsing: Ensure SQLite timestamp is treated as UTC
                                const ts = msg.timestamp.includes('T') ? msg.timestamp : msg.timestamp.replace(' ', 'T') + 'Z';
                                const sentAt = new Date(ts).getTime();
                                const now = new Date().getTime();
                                const oneHour = 60 * 60 * 1000;
                                const isWithinHour = (now - sentAt) < oneHour;
                                const isDeleted = Number(msg.is_deleted) === 1;

                                if (isOwner && isWithinHour && !isDeleted) {
                                    return (
                                        <button
                                            onClick={() => {
                                                setEditingMessage(msg);
                                                setNewMessage(msg.message);
                                                setReplyTo(null);
                                                setContextMenu(null);
                                                // fileInputRef.current?.focus(); // Standard focus might be better than fileInput for editing text
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" /> Edit Message
                                        </button>
                                    );
                                }
                                return null;
                            })()}

                            <div className="h-px bg-slate-700 my-1" />

                            {/* Allow Delete for Message Owner OR Admins in Channels (Not DMs) */}
                            {(() => {
                                const msg = contextMenu.data;
                                const msgAuthorId = msg.sender_id ?? msg.user_id;
                                const isOwner = Number(msgAuthorId) === Number(currentUser?.id);
                                const isDMMessage = msg.receiver_id !== undefined;
                                const isDeleted = Number(msg.is_deleted) === 1;

                                // In DM, only owner can delete. In Channels, admin can also delete.
                                if (!isDeleted && (isOwner || (isAdmin && !isDMMessage))) {
                                    return (
                                        <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-3 py-2 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                            <Trash2 className="w-4 h-4" /> Delete Message
                                        </button>
                                    );
                                }
                                return null;
                            })()}

                            <button onClick={() => {
                                askConfirm("Are you sure you want to report this message?", () => {
                                    handleReportMessage(contextMenu.data.id, "Inappropriate content");
                                });
                            }} className="w-full text-left px-3 py-2 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                <AlertTriangle className="w-4 h-4" /> Report Message
                            </button>
                        </>
                    )}
                    {contextMenu.type === 'user' && (
                        <>
                            <div className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest">{contextMenu.data.name || 'User Settings'}</div>
                            <button
                                onClick={() => openDM(contextMenu.data)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-2"
                            >
                                <MessageSquare className="w-4 h-4" /> Direct Message
                            </button>
                            {blockedByMe.includes(contextMenu.data.id) ? (
                                <button onClick={() => handleUnblockUserDM(contextMenu.data.id)} className="w-full text-left px-3 py-2 hover:bg-emerald-900/40 text-emerald-400 rounded-lg text-sm font-bold flex items-center gap-2">🔓 Unblock User</button>
                            ) : (
                                <button onClick={() => handleBlockUser(contextMenu.data.id)} className="w-full text-left px-3 py-2 hover:bg-rose-900/40 text-rose-400 rounded-lg text-sm font-bold flex items-center gap-2">🚫 Block User</button>
                            )}
                            <div className="h-px bg-slate-700 my-1" />
                            <button onClick={() => handleReportUser(contextMenu.data.id)} className="w-full text-left px-3 py-2 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Report User</button>

                            {viewMode === 'dms' && activeDM && Number(activeDM.user_id) === Number(contextMenu.data.id) && (
                                <>
                                    <div className="h-px bg-slate-700 my-1" />
                                    <button
                                        onClick={() => handleClearDMHistory(activeDM.user_id)}
                                        className="w-full text-left px-3 py-2 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Clear Conversation
                                    </button>
                                </>
                            )}
                            {isAdmin && (
                                <>
                                    {contextMenu.data.banned_until ? (
                                        <button onClick={() => handleUnbanUser(contextMenu.data.id, false)} className="w-full text-left px-3 py-2 hover:bg-emerald-900/50 text-emerald-500 hover:text-emerald-400 rounded-lg text-sm font-black flex items-center gap-2">🔓 Global Unban</button>
                                    ) : contextMenu.data.is_banned_in_channel ? (
                                        <button onClick={() => handleUnbanUser(contextMenu.data.id, true)} className="w-full text-left px-3 py-2 hover:bg-emerald-900/50 text-emerald-500 hover:text-emerald-400 rounded-lg text-sm font-black flex items-center gap-2">🔓 Unban from Channel</button>
                                    ) : (
                                        <button onClick={() => handleBanUser(contextMenu.data.id)} className="w-full text-left px-3 py-2 hover:bg-rose-900/50 text-rose-500 hover:text-rose-400 rounded-lg text-sm font-black flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Ban Member</button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {contextMenu.type === 'channel' && isStaff && (
                        <>
                            <div className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest">#{contextMenu.data.name}</div>
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setEditChannel(contextMenu.data);
                                        setNewChannelName(contextMenu.data.name);
                                        setNewChannelReadOnly(contextMenu.data.read_only);
                                        setShowCreateChannel(true);
                                        setContextMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-2"
                                >
                                    <Settings className="w-4 h-4" /> Edit Channel
                                </button>
                            )}
                            <div className="h-px bg-slate-700 my-1" />
                            <button onClick={() => handleClearChat(contextMenu.data.id)} className="w-full text-left px-3 py-2 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 rounded-lg text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Clear History</button>
                            {isAdmin && (
                                <button onClick={() => handleDeleteChannel(contextMenu.data.id)} className="w-full text-left px-3 py-2 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-sm font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Channel</button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Create Channel Modal */}
            <AnimatePresence>
                {showCreateChannel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-slate-500/20 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl w-full max-w-md space-y-4 border border-white/40" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-black text-slate-800">{editChannel ? 'Edit Channel' : 'Create Text Channel'}</h3>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Channel Name</label>
                                <input
                                    value={newChannelName}
                                    onChange={e => setNewChannelName(e.target.value)}
                                    placeholder="new-channel-name"
                                    className="w-full bg-slate-100 p-3 rounded-xl font-bold border-none outline-none focus:ring-2 ring-sapphire-500"
                                />
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={newChannelReadOnly}
                                    onChange={e => setNewChannelReadOnly(e.target.checked)}
                                    className="w-5 h-5 accent-sapphire-600 rounded-lg"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-700 flex items-center gap-2"><Lock className="w-4 h-4" /> Read-Only Channel</div>
                                    <div className="text-xs text-slate-400 font-medium">Only Admins and Whitelisted users can chat</div>
                                </div>
                            </label>

                            {/* Whitelist Management (Only in Edit Mode & Read-Only) */}
                            {editChannel && newChannelReadOnly && (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Whitelist Users</label>

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            className="w-full bg-slate-100 pl-9 pr-3 py-2 rounded-lg text-sm font-medium outline-none border border-transparent focus:border-sapphire-300 transition-all placeholder:text-slate-400"
                                            placeholder="Search users to whitelist..."
                                            value={whitelistSearch}
                                            onChange={(e) => setWhitelistSearch(e.target.value)}
                                        />
                                    </div>

                                    {/* User Suggestions List */}
                                    {whitelistSearch && (
                                        <div className="max-h-40 overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200 rounded-lg shadow-xl z-50">
                                            {onlineUsers
                                                .filter(u =>
                                                    !editChannel.whitelisted_users?.map(Number).includes(Number(u.id)) &&
                                                    Number(u.id) !== Number(currentUser?.id) && // Don't show self if needed, or just admin check
                                                    u.role !== 'admin' &&
                                                    u.name.toLowerCase().includes(whitelistSearch.toLowerCase())
                                                )
                                                .map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => {
                                                            fetch(`${API_BASE_URL}/api/channels/${editChannel.id}/whitelist`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ user_id: u.id })
                                                            }).then(() => fetchChannels().then((data: any) => {
                                                                const updated = data.channels.find((c: Channel) => c.id === editChannel.id);
                                                                if (updated) setEditChannel(updated);
                                                            }));
                                                            setWhitelistSearch('');
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between group"
                                                    >
                                                        <span className="font-medium text-slate-700">{u.name}</span>
                                                        <span className="text-xs text-slate-400 group-hover:text-sapphire-600">Add +</span>
                                                    </button>
                                                ))
                                            }
                                            {onlineUsers.filter(u => !editChannel.whitelisted_users?.includes(u.id) && u.role !== 'admin' && u.name.toLowerCase().includes(whitelistSearch.toLowerCase())).length === 0 && (
                                                <div className="p-2 text-xs text-center text-slate-400 italic">No users found</div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {editChannel.whitelisted_users?.map(Number).map(uid => {
                                            const user = onlineUsers.find(u => Number(u.id) === uid); // Note: Only shows online users name correctly if we don't fetch all users. For hackathon, reliable enough? Or just show ID backing. 
                                            // Ideally we should have a user cache or fetch user details. For now, showing ID fallback is safer.
                                            return (
                                                <div key={uid} className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200">
                                                    <span>{user ? user.name : `User #${uid}`}</span>
                                                    <button
                                                        onClick={() => {
                                                            fetch(`${API_BASE_URL}/api/channels/${editChannel.id}/whitelist/${uid}`, { method: 'DELETE' })
                                                                .then(() => fetchChannels().then((data: any) => {
                                                                    const updated = data.channels.find((c: Channel) => c.id === editChannel.id);
                                                                    if (updated) setEditChannel(updated);
                                                                }));
                                                        }}
                                                        className="hover:text-emerald-900 bg-emerald-200/50 rounded-full w-4 h-4 flex items-center justify-center ml-1"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {(!editChannel.whitelisted_users || editChannel.whitelisted_users.length === 0) && (
                                            <div className="text-xs text-slate-400 italic">No whitelisted users.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => { setShowCreateChannel(false); setEditChannel(null); setNewChannelName(''); setNewChannelReadOnly(false); }} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button onClick={handleCreateChannel} className="px-4 py-2 font-bold bg-sapphire-600 text-white rounded-lg hover:bg-sapphire-700 shadow-lg shadow-sapphire-200">{editChannel ? 'Save Changes' : 'Create Channel'}</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audit Log Modal */}
            <AnimatePresence>
                {showAuditLog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-slate-500/10 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowAuditLog(false)}>
                        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden border border-white/40" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
                                <h3 className="font-black text-slate-700 uppercase tracking-wide flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-sapphire-600" /> Audit Log</h3>
                                <button onClick={() => setShowAuditLog(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                    <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                                {auditLogs.map(log => (
                                    <div key={log.id} className="text-xs p-3 bg-slate-50 border border-slate-100 rounded-lg flex flex-col gap-1">
                                        <div className="flex justify-between font-bold text-slate-700">
                                            <span>{log.action}</span>
                                            <span className="text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div className="text-slate-600">{log.details}</div>
                                        <div className="text-[10px] text-slate-400">User ID: {log.user_id} ({log.user_name})</div>
                                    </div>
                                ))}
                                {auditLogs.length === 0 && <div className="text-center text-slate-400 italic mt-10">No logs found.</div>}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Role Manager Modal */}
            <AnimatePresence>
                {showRoleManager && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[70] bg-slate-500/10 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-lg max-h-[600px] flex flex-col overflow-hidden border border-white/40" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-black text-slate-700 uppercase tracking-wide flex items-center gap-2"><Users className="w-5 h-5 text-sapphire-600" /> Manage Roles</h3>
                                <button onClick={() => setShowRoleManager(false)} className="p-2 hover:bg-slate-200 rounded-lg"><Plus className="w-5 h-5 rotate-45 text-slate-400" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {onlineUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{user.name[0]}</div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-700">{user.name} <span className="text-slate-400 font-normal text-xs">#{user.id}</span></div>
                                                <div className="text-xs text-sapphire-600 font-medium uppercase">{user.role}</div>
                                            </div>
                                        </div>
                                        {isAdmin ? (
                                            <select
                                                value={user.role}
                                                onChange={(e) => {
                                                    const newRole = e.target.value;
                                                    askConfirm(`Change ${user.name}'s role to ${newRole}?`, () => {
                                                        fetch(`${API_BASE_URL}/api/users/${user.id}/role`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ role: newRole })
                                                        }).then(async () => {
                                                            await fetchUsers();
                                                            showToast(`Role updated to ${newRole}`, 'success');
                                                        });
                                                    });
                                                }}
                                                className="bg-white border border-slate-200 text-xs font-bold p-1 px-2 rounded-lg outline-none focus:border-sapphire-500"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="moderator">Moderator</option>
                                            </select>
                                        ) : (
                                            <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                                {user.role}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reported Users Modal */}
            <AnimatePresence>
                {showReportsList && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-rose-500/5 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowReportsList(false)}>
                        <div className="bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-white/50" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
                                <h3 className="font-black text-slate-700 uppercase tracking-wide flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-500" /> Reported Users</h3>
                                <button onClick={() => setShowReportsList(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                    <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                                {reports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                        <ShieldAlert className="w-16 h-16 mb-4" />
                                        <p className="font-bold">No active reports</p>
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative group hover:border-sapphire-200 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Reporter</span>
                                                    <span className="font-bold text-sm text-slate-700">{report.reporter_name}</span>
                                                    <span className="text-slate-400">reported</span>
                                                    <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Suspect</span>
                                                    <span className="font-bold text-sm text-slate-700">{report.reported_name}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">{new Date(report.timestamp).toLocaleString()}</div>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg border border-slate-100 mb-3 text-sm text-slate-600 italic">
                                                "{report.reason}"
                                            </div>

                                            <div className="flex items-center gap-2 justify-end">
                                                <div className="text-xs text-slate-400 font-medium mr-auto">Channel: #{report.channel_name}</div>

                                                <button
                                                    onClick={() => {
                                                        askConfirm("Dismiss this report?", () => {
                                                            fetch(`${API_BASE_URL}/api/reports/${report.id}`, { method: 'DELETE' })
                                                                .then(() => {
                                                                    fetchReports();
                                                                    showToast("Report dismissed", 'info');
                                                                });
                                                        });
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                                <button
                                                    onClick={() => handleBanUser(report.reported_id)}
                                                    className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <ShieldAlert className="w-3 h-3" /> Ban User
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ban Modal */}
            <AnimatePresence>
                {showBanModal && banCandidate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-rose-500/10 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowBanModal(false)}>
                        <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl w-full max-w-sm p-6 text-center border border-white/40 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                                <Ban className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Ban {banCandidate.name}?</h3>
                            <p className="text-slate-500 mb-6">Select the scope of this ban. This action can be undone later by admins.</p>

                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                                <button onClick={() => setIsGlobalBan(true)} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", isGlobalBan ? "bg-white shadow text-rose-600" : "text-slate-400 hover:text-slate-600")}>
                                    Global Ban
                                </button>
                                <button onClick={() => setIsGlobalBan(false)} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", !isGlobalBan ? "bg-white shadow text-sapphire-600" : "text-slate-400 hover:text-slate-600")}>
                                    Channel Only
                                </button>
                            </div>

                            {!isGlobalBan && (
                                <div className="mb-4 text-sm font-medium text-sapphire-600 bg-sapphire-50 px-3 py-2 rounded-lg">
                                    Banning from <b>#{currentChannelObj?.name}</b>
                                </div>
                            )}

                            <textarea
                                value={banReason}
                                onChange={e => setBanReason(e.target.value)}
                                placeholder="Reason for ban (optional)..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none h-24 mb-6"
                            />

                            <div className="flex gap-3">
                                <button onClick={() => setShowBanModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button onClick={confirmBan} className="flex-1 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2">
                                    <Ban className="w-4 h-4" /> Confirm Ban
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Channel Settings Modal */}
            <AnimatePresence>
                {showChannelSettings && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowChannelSettings(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md p-6 border border-white/40 max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-sapphire-600" /> Channel Settings
                                    </h3>
                                    <p className="text-sm text-slate-400 font-medium">#{activeChannel}</p>
                                </div>
                                <button onClick={() => setShowChannelSettings(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                                </button>
                            </div>

                            {/* My Role Badge */}
                            <div className="mb-6 p-4 bg-gradient-to-r from-sapphire-50 to-emerald-50 rounded-2xl border border-sapphire-100">
                                <div className="text-xs text-slate-500 mb-1 font-medium">Your Role</div>
                                <div className={cn("text-lg font-black",
                                    myChannelRole === 'owner' ? "text-amber-600" :
                                        myChannelRole === 'moderator' ? "text-emerald-600" : "text-slate-600"
                                )}>
                                    {myChannelRole === 'owner' ? '👑 Owner' : myChannelRole === 'moderator' ? '🛡️ Moderator' : myChannelRole === 'member' ? '👤 Member' : '👤 No Role'}
                                </div>
                            </div>

                            {/* Roles List */}
                            <div className="mb-4">
                                <div className="text-sm font-black text-slate-700 mb-3">Channel Roles</div>
                                {channelRoles.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">No roles assigned yet</div>
                                ) : (
                                    <div className="space-y-2">
                                        {channelRoles.map(r => (
                                            <div key={r.user_id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold">
                                                        {r.user_name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{r.user_name}</div>
                                                        <div className={cn("text-xs font-medium",
                                                            r.role === 'owner' ? "text-amber-600" :
                                                                r.role === 'moderator' ? "text-emerald-600" : "text-slate-400"
                                                        )}>{r.role}</div>
                                                    </div>
                                                </div>
                                                {(myChannelRole === 'owner' || isAdmin) && r.user_id !== currentUser?.id && (
                                                    <div className="flex items-center gap-1">
                                                        {isAdmin && r.role !== 'owner' && (
                                                            <button onClick={() => assignRole(r.user_id, 'owner')} className="text-amber-500 hover:bg-amber-50 p-1 rounded text-xs" title="Make Owner">👑</button>
                                                        )}
                                                        <button onClick={() => removeRole(r.user_id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Roles (Owner or Admin) */}
                            {(myChannelRole === 'owner' || isAdmin) && (
                                <div className="border-t border-slate-100 pt-4">
                                    <div className="text-sm font-black text-slate-700 mb-3">Manage Roles</div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {onlineUsers.filter(u => !channelRoles.find(r => r.user_id === u.id)).map(u => (
                                            <div key={u.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                                                        {u.name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700">{u.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => assignRole(u.id, 'owner')}
                                                            className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                                                            title="Add as Owner"
                                                        >
                                                            👑
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => assignRole(u.id, 'moderator')}
                                                        className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                                                        title="Add as Moderator"
                                                    >
                                                        🛡️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Avatar Selection Modal */}
            <AnimatePresence>
                {showAvatarModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-slate-500/20 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden" onClick={() => { setShowAvatarModal(false); stopCamera(); }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-sm p-5 border border-white/40 max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-800">Choose Your Avatar</h3>
                                <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                                </button>
                            </div>

                            {/* Current Avatar Preview */}
                            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
                                <div className="w-16 h-16 rounded-full bg-sapphire-600 flex items-center justify-center text-white font-bold text-2xl overflow-hidden ring-4 ring-white shadow-lg">
                                    {userBanStatus.avatar_url ? (
                                        <img src={userBanStatus.avatar_url} alt="Current" className="w-full h-full object-cover" />
                                    ) : (
                                        currentUser?.name?.[0] || 'U'
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">{currentUser?.name || 'User'}</div>
                                    <div className="text-xs text-slate-400">Click an avatar below to change</div>
                                </div>
                            </div>

                            {/* Preset Avatars Grid - Scrollable */}
                            <div className="mb-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                                {['Medical', 'Wellness', 'People'].map(category => (
                                    <div key={category} className="mb-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 sticky top-0 bg-white/95 py-1">{category}</div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {presetAvatars.filter(a => a.category === category).map(avatar => (
                                                <button
                                                    key={avatar.id}
                                                    onClick={() => handleAvatarSelect(avatar.url)}
                                                    className="w-11 h-11 rounded-full overflow-hidden hover:ring-4 ring-sapphire-400 ring-offset-1 transition-all hover:scale-105 bg-slate-100"
                                                    title={avatar.label}
                                                >
                                                    <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Upload & Camera */}
                            <div className="border-t border-slate-100 pt-4 space-y-3">
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Camera Preview */}
                                {showCamera && (
                                    <div className="relative" onClick={e => e.stopPropagation()}>
                                        <video ref={videoRef} className="w-full h-48 object-cover rounded-2xl bg-black" autoPlay muted playsInline />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-32 h-32 border-4 border-white/50 rounded-full" />
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); stopCamera(); }} className="flex-1 py-2 rounded-xl font-bold bg-slate-200 text-slate-600 hover:bg-slate-300">Cancel</button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); capturePhoto(); }} className="flex-1 py-2 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center justify-center gap-2">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={2} /><circle cx="12" cy="12" r="4" fill="currentColor" /></svg>
                                                Capture
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {!showCamera && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={startCamera}
                                            disabled={isUploadingAvatar}
                                            className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            Take Photo
                                        </button>
                                        <button
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={isUploadingAvatar}
                                            className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-sapphire-500 to-indigo-600 text-white hover:from-sapphire-600 hover:to-indigo-700 shadow-lg shadow-sapphire-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isUploadingAvatar ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    Upload
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                                <p className="text-[10px] text-center text-slate-400">Max 2MB • PNG, JPG, or WebP</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showReportModal && reportingUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-slate-500/5 backdrop-blur-2xl flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowReportModal(false)}>
                        <div className="bg-white/5 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-sm p-5 space-y-4 border border-white/20 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <AlertTriangle className="w-6 h-6 text-rose-500" />
                                <h3 className="text-xl font-black text-slate-800">Report User</h3>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Reporting</label>
                                <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3 mt-1">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{reportingUser.name[0]}</div>
                                    <div className="font-bold text-slate-700">{reportingUser.name} <span className="text-slate-400 font-normal">#{reportingUser.id}</span></div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Reason for Report</label>
                                <textarea
                                    value={reportReason}
                                    onChange={e => setReportReason(e.target.value)}
                                    placeholder="Describe the issue..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none h-32"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setShowReportModal(false); setReportingUser(null); }} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button
                                    disabled={!reportReason.trim()}
                                    onClick={submitReport}
                                    className="flex-1 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200 transition-all"
                                >
                                    Submit Report
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,video/*"
            />

            {/* 1. Server Rail (Hidden on mobile) */}
            <div className="w-[72px] bg-slate-900/10 hidden md:flex flex-col items-center py-4 gap-4 z-40 shrink-0 border-r border-white/10" style={{ backdropFilter: 'blur(80px)', WebkitBackdropFilter: 'blur(80px)' }}>
                <div
                    onClick={() => { setViewMode('channels'); setActiveDM(null); }}
                    className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg cursor-pointer transition-all",
                        viewMode === 'channels' ? "bg-sapphire-500 text-white rounded-xl shadow-sapphire-500/20" : "bg-white/10 text-slate-400 hover:rounded-xl hover:bg-white/20 hover:text-white"
                    )}
                >
                    EG
                </div>

                <div className="w-8 h-[2px] bg-white/10 rounded-full" />

                <div
                    onClick={() => setViewMode('dms')}
                    className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer transition-all relative",
                        viewMode === 'dms' ? "bg-sapphire-500 text-white rounded-xl shadow-sapphire-500/20" : "bg-white/10 text-slate-400 hover:rounded-xl hover:bg-white/20 hover:text-white"
                    )}
                >
                    <MessageSquare className="w-6 h-6" />
                    {dmConversations.reduce((acc, dm) => acc + dm.unread_count, 0) > 0 && (
                        <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                            {dmConversations.reduce((acc, dm) => acc + dm.unread_count, 0)}
                        </div>
                    )}
                </div>

                <div className="w-8 h-[2px] bg-white/10 rounded-full" />

                {isAdmin && (
                    <div onClick={() => {
                        setEditChannel(null);
                        setNewChannelName('');
                        setNewChannelReadOnly(false);
                        setShowCreateChannel(true);
                    }} className="w-12 h-12 bg-white/10 hover:bg-emerald-500 hover:text-white text-emerald-400 rounded-[24px] hover:rounded-xl flex items-center justify-center transition-all cursor-pointer group shadow-lg" title="Create Channel">
                        <Plus className="w-6 h-6" />
                    </div>
                )}
            </div>

            {/* 2. Channel Sidebar (Responsive) */}
            <div className={cn(
                "w-64 bg-white/70 md:bg-white/5 flex flex-col border-r border-white/10 z-30 transition-all absolute md:static inset-y-0 left-0 shadow-2xl md:shadow-none",
                showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )} style={{ backdropFilter: 'blur(80px)', WebkitBackdropFilter: 'blur(80px)' }}>
                {/* Mobile Close Button - Adjusted position to avoid overlap */}
                <button onClick={() => setShowMobileSidebar(false)} className="md:hidden absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 z-[60] bg-white/10 rounded-full hover:bg-white/20 transition-all"><Plus className="w-5 h-5 rotate-45" /></button>
                <div className="p-4 h-12 flex items-center justify-between border-b border-black/5 bg-white/95 md:bg-white/5 font-black text-slate-700 uppercase tracking-wider text-sm select-none relative z-50">
                    <span className="relative z-10">{viewMode === 'channels' ? 'Health Hub' : 'Direct Messages'}</span>
                    {viewMode === 'channels' && isAdmin && (
                        <div className="relative mr-8 md:mr-0"> {/* Margin to avoid close button on mobile */}
                            <Settings
                                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-transform hover:rotate-90"
                                onClick={(e) => { e.stopPropagation(); setShowServerSettings(!showServerSettings); }}
                            />
                            <AnimatePresence>
                                {showServerSettings && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-6 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50"
                                    >
                                        <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Admin Tools</div>
                                        {isAdmin && (
                                            <button onClick={() => { setShowCreateChannel(true); setShowServerSettings(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-sapphire-600 flex items-center gap-2">
                                                <Plus className="w-3 h-3" /> Create Channel
                                            </button>
                                        )}
                                        {isStaff && (
                                            <>
                                                <button onClick={() => { setShowAuditLog(true); fetchAuditLogs(); setShowServerSettings(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-sapphire-600 flex items-center gap-2">
                                                    <ShieldAlert className="w-3 h-3" /> Audit Log
                                                </button>
                                                <button onClick={() => { setShowReportsList(true); fetchReports(); setShowServerSettings(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-sapphire-600 flex items-center gap-2">
                                                    <AlertTriangle className="w-3 h-3" /> Reported Users
                                                </button>
                                            </>
                                        )}
                                        {isAdmin && (
                                            <button onClick={() => { setShowRoleManager(true); setShowServerSettings(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-sapphire-600 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> Manage Roles
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                    {viewMode === 'dms' ? (
                        <>
                            {dmConversations.length > 0 ? (
                                dmConversations.map(dm => (
                                    <button
                                        key={dm.user_id}
                                        onClick={() => openDM(dm)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                                            activeDM?.user_id === dm.user_id
                                                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg"
                                                : "text-slate-600 hover:bg-white/40"
                                        )}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden flex-shrink-0">
                                            {dm.avatar_url ? <img src={dm.avatar_url} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-xs font-bold">{dm.name[0]}</span>}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="font-bold text-sm truncate">{dm.name}</div>
                                            {dm.last_message && <div className={cn("text-[10px] truncate", activeDM?.user_id === dm.user_id ? "text-emerald-50" : "text-slate-400")}>{dm.last_message}</div>}
                                        </div>
                                        {dm.unread_count > 0 && <div className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{dm.unread_count}</div>}
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-10 px-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <MessageSquare className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-xs text-slate-400 font-bold">No DMs yet</p>
                                    <p className="text-[10px] text-slate-300 mt-1">Right-click a user in the members list to message them!</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="px-2 pt-2 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Text Channels
                            </div>
                            {channels.map(channel => {
                                const isUnread = channel.last_message_at && lastVisitedChannels[channel.id] && lastVisitedChannels[channel.id] < channel.last_message_at;
                                return (
                                    <button
                                        key={channel.id}
                                        onContextMenu={(e) => handleContextMenu(e, 'channel', channel)}
                                        onClick={() => {
                                            setActiveChannel(channel.id);
                                            setActiveDM(null);
                                            setShowMobileSidebar(false);
                                            // Mark as read locally
                                            setLastVisitedChannels(prev => {
                                                const next = { ...prev, [channel.id]: new Date().toISOString() };
                                                localStorage.setItem('lastVisitedChannels', JSON.stringify(next));
                                                return next;
                                            });
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all group relative",
                                            activeChannel === channel.id
                                                ? "bg-gradient-to-r from-sapphire-600 to-indigo-500 text-white shadow-lg"
                                                : "text-slate-600 hover:bg-white/40"
                                        )}
                                    >
                                        {channel.read_only ? <Lock className="w-4 h-4 text-slate-400" strokeWidth={3} /> : <Hash className={cn("w-4 h-4", activeChannel === channel.id ? "text-sapphire-200" : "text-slate-400")} strokeWidth={3} />}
                                        <span className={cn("flex-1 text-left font-bold text-sm", activeChannel === channel.id ? "" : isUnread ? "text-slate-900" : "text-slate-600")}>{channel.name}</span>
                                        {isUnread && activeChannel !== channel.id && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm" />}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Quick Actions - Bottom Sidebar Buttons */}
                <div className={cn("px-2 py-3 border-t flex flex-wrap gap-2", isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200/50 bg-white/20")}>

                    {/* Settings Shortcut */}
                    <button
                        onClick={() => { fetchChannelRoles(activeChannel); setShowChannelSettings(true); }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                            isDarkMode
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                        )}
                        title="Channel Settings"
                    >
                        <Settings className="w-4 h-4" />
                        Roles
                    </button>

                    {/* Mute Toggle */}
                    <button
                        onClick={() => setIsMuted(prev => !prev)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                            isMuted
                                ? "bg-rose-500/20 text-rose-400"
                                : isDarkMode
                                    ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
                                    : "bg-sky-500/20 text-sky-600 hover:bg-sky-500/30"
                        )}
                        title={isMuted ? "Unmute" : "Mute Notifications"}
                    >
                        {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        {isMuted ? "Muted" : "Sound"}
                    </button>
                </div>

                <div className={cn("p-2 backdrop-blur-md flex items-center gap-2 border-t mt-auto", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/10 border-black/5")}>
                    <div
                        className="w-8 h-8 rounded-full bg-sapphire-600 flex items-center justify-center text-white font-bold text-xs relative cursor-pointer hover:ring-2 ring-sapphire-400 ring-offset-2 ring-offset-slate-100 transition-all group overflow-hidden"
                        onClick={() => setShowAvatarModal(true)}
                        title="Change Avatar"
                    >
                        {userBanStatus.avatar_url ? (
                            <img src={userBanStatus.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            currentUser?.name?.[0] || 'U'
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'User'}</div>
                        <div className="text-[10px] text-slate-500 truncate">#{currentUser?.id || '0000'}</div>
                    </div>
                </div>
            </div>

            {/* 3. Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white/5 min-w-0 relative">
                {/* Header */}
                <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-white/5 z-20" style={{ backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)' }}>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowMobileSidebar(true)} className="md:hidden p-1 text-slate-500 hover:bg-slate-100 rounded-md"><Menu className="w-6 h-6" /></button>
                        {viewMode === 'dms' && activeDM ? (
                            <>
                                <div className="w-7 h-7 rounded-full bg-slate-300 overflow-hidden">
                                    {activeDM.avatar_url ? <img src={activeDM.avatar_url} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-xs font-bold">{activeDM.name[0]}</span>}
                                </div>
                                <span className="font-bold text-slate-700 truncate max-w-[150px]">{activeDM.name}</span>
                                <button onClick={() => { setViewMode('channels'); setActiveDM(null); }} className="ml-2 text-xs text-slate-400 hover:text-slate-600">← Back</button>
                            </>
                        ) : (
                            <>
                                <Hash className="w-6 h-6 text-slate-400" />
                                <span className="font-bold text-slate-700">#{activeChannel}</span>
                                <button
                                    onClick={() => { fetchChannelRoles(activeChannel); setShowChannelSettings(true); }}
                                    className={cn(
                                        "ml-2 p-1.5 rounded-lg transition-all",
                                        isDarkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                    )}
                                    title="Channel Settings"
                                >
                                    <Settings className="w-4 h-4" strokeWidth={3} />
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMuted(prev => !prev)} title={isMuted ? "Unmute Notifications" : "Mute Notifications"}>
                            {isMuted ? (
                                <BellOff className="w-5 h-5 text-rose-500 transition-colors" strokeWidth={2.5} />
                            ) : (
                                <Bell className={cn("w-5 h-5 transition-colors cursor-pointer", isDarkMode ? "text-slate-200 hover:text-white" : "text-slate-500 hover:text-slate-900")} strokeWidth={2.5} />
                            )}
                        </button>

                        <Users
                            className={cn("w-5 h-5 cursor-pointer block lg:hidden transition-colors",
                                showMobileMembers
                                    ? "text-sapphire-600"
                                    : isDarkMode ? "text-slate-200 hover:text-white" : "text-slate-500 hover:text-slate-900"
                            )}
                            onClick={() => setShowMobileMembers(!showMobileMembers)}
                            strokeWidth={2.5}
                        />

                        {viewMode === 'dms' && activeDM && (
                            <button
                                onClick={(e) => handleContextMenu(e, 'user', { ...activeDM, id: activeDM.user_id })}
                                title="Conversation Settings"
                                className="hover:bg-slate-100 p-1.5 rounded-full transition-colors group"
                            >
                                <Settings
                                    className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:rotate-90"
                                />
                            </button>
                        )}

                        <div className="w-64 relative hidden md:block group focus-within:w-72 transition-all duration-300">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search messages or users..."
                                className="w-full bg-slate-100 text-xs py-1.5 px-3 pl-3 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-sapphire-100 transition-all font-medium text-slate-600 placeholder:text-slate-400"
                            />
                            {searchQuery ? (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"><Trash2 className="w-3 h-3" /></button>
                            ) : (
                                <Search className="w-3 h-3 absolute right-2.5 top-2 text-slate-400" />
                            )}

                            {/* Search Suggestions Dropdown */}
                            <AnimatePresence>
                                {searchQuery && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1"
                                    >
                                        <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">Users</div>
                                        {onlineUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(u => (
                                            <div key={u.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2" onClick={() => setSearchQuery(u.name)}>
                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{u.name[0]}</div>
                                                <span className="text-xs font-bold text-slate-700">{u.name}</span>
                                            </div>
                                        ))}
                                        {onlineUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                            <div className="px-3 py-2 text-xs text-slate-400 italic">No users found</div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div
                    className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 overscroll-y-contain relative"
                    ref={scrollRef}
                    onScroll={() => {
                        if (scrollRef.current) {
                            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                            setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
                        }
                    }}
                >
                    {/* Date Header */}
                    <div className="flex justify-center sticky top-0 z-[5] py-2 pointer-events-none -mx-4">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-slate-900/60 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 shadow-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2"
                        >
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </motion.div>
                    </div>

                    {/* DM Messages View */}
                    {viewMode === 'dms' && activeDM ? (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 overflow-hidden mb-3">
                                    {activeDM.avatar_url ? <img src={activeDM.avatar_url} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-2xl font-bold text-slate-500">{activeDM.name[0]}</span>}
                                </div>
                                <h3 className="font-bold text-lg text-slate-700">{activeDM.name}</h3>
                                <p className="text-sm text-slate-400">This is the beginning of your direct message history</p>
                            </div>
                            {dmMessages.map(dm => (
                                <div
                                    key={dm.id}
                                    onContextMenu={(e) => handleContextMenu(e, 'message', dm)}
                                    className={cn("flex gap-3 mb-3 cursor-context-menu", Number(dm.sender_id) === Number(currentUser?.id) ? "flex-row-reverse" : "")}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                        {dm.sender_avatar ? <img src={dm.sender_avatar} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-xs font-bold">{dm.sender_name?.[0]}</span>}
                                    </div>
                                    <div className={cn("max-w-[70%] p-3 rounded-2xl", dm.sender_id === currentUser?.id ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : "bg-slate-100 text-slate-700 shadow-sm")}>
                                        {dm.attachment_url && Number(dm.is_deleted) !== 1 && (
                                            <div className="mb-2 rounded-lg overflow-hidden border border-black/5">
                                                {dm.attachment_type?.startsWith('video/') ? (
                                                    <video src={dm.attachment_url} controls className="max-w-full h-auto" />
                                                ) : (
                                                    <img src={dm.attachment_url} alt="attachment" className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(dm.attachment_url)} />
                                                )}
                                            </div>
                                        )}
                                        {Number(dm.is_deleted) === 1 ? (
                                            <p className="text-sm italic text-rose-300 font-medium">this message was deleted by {dm.sender_name || 'user'}</p>
                                        ) : (
                                            <p className="text-sm break-words">{dm.message}</p>
                                        )}
                                        <span className={cn("text-[10px] opacity-70 block mt-1", dm.sender_id === currentUser?.id ? "text-right" : "")}>{new Date(dm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                            {dmMessages.length === 0 && <p className="text-center text-slate-400 text-sm italic mt-8">No messages yet. Say hello! 👋</p>}
                        </>
                    ) : (
                        /* Channel Messages */
                        (searchQuery
                            ? messages.filter(m =>
                                m.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                m.user_name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            : messages
                        ).map((msg, i, arr) => {
                            const isChained = i > 0 && arr[i - 1].user_id === msg.user_id && !msg.reply_to_id && !msg.attachment_url && (new Date(msg.timestamp).getTime() - new Date(arr[i - 1].timestamp).getTime() < 60000);
                            const replyingToMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;


                            return (
                                <motion.div
                                    key={msg.id}
                                    id={`message-${msg.id}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.3 }}
                                    className={cn(
                                        "group flex gap-4 pl-2 pr-4 -mx-4 py-0.5 border-l-2 border-transparent relative",
                                        isChained ? "mt-0.5" : "mt-4",
                                        isDarkMode ? "hover:bg-slate-800/50 hover:border-slate-600" : "hover:bg-slate-50/50 hover:border-slate-200"
                                    )}
                                    onContextMenu={(e) => handleContextMenu(e, 'message', msg)}
                                >
                                    {/* ... (Message Content - Omitted for brevity: Assume existing content) ... */}
                                    {!isChained ? (
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden mt-0.5" onClick={(e) => handleContextMenu(e, 'user', { id: msg.user_id, name: msg.user_name })}>
                                            {(() => {
                                                const msgUser = onlineUsers.find(u => u.id === msg.user_id);
                                                return msgUser?.avatar_url ? (
                                                    <img src={msgUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user_id}`} alt="avatar" className="w-full h-full" />
                                                );
                                            })()}
                                        </div>
                                    ) : <div className="w-10 flex-shrink-0 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 text-right pr-2 select-none">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}

                                    <div className="flex-1 min-w-0">
                                        {!isChained && (
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn("font-bold hover:underline cursor-pointer",
                                                        // Generate consistent color from user_id
                                                        (() => {
                                                            const colors = [
                                                                "text-red-600", "text-orange-600", "text-amber-600",
                                                                "text-yellow-600", "text-lime-600", "text-green-600",
                                                                "text-emerald-600", "text-teal-600", "text-cyan-600",
                                                                "text-sky-600", "text-blue-600", "text-indigo-600",
                                                                "text-violet-600", "text-purple-600", "text-fuchsia-600",
                                                                "text-pink-600", "text-rose-600"
                                                            ];
                                                            const colorIndex = (msg.user_id || 0) % colors.length;
                                                            return msg.user_id === currentUser?.id ? "text-slate-900" : colors[colorIndex]; // Keep self dark for contrast or color too? Let's color everyone. 
                                                            // Actually, user requested "give EACH user a different color".
                                                            // Self usually has a distinct style in many apps, but let's stick to the requested "different color".
                                                            // To make "me" stand out, we could keep me standard or use the hash too. 
                                                            // Let's use the hash for everyone as requested.
                                                        })()
                                                    )}
                                                    onClick={(e) => handleContextMenu(e, 'user', { id: msg.user_id, name: msg.user_name })}
                                                >
                                                    {msg.user_name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium ml-1">
                                                    {new Date(msg.timestamp).toLocaleDateString()} at {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        {replyingToMsg && (
                                            <div
                                                className="flex items-center gap-1 mb-1 text-xs text-slate-400 opacity-80 cursor-pointer hover:bg-slate-100 rounded-md p-1 -ml-1 transition-colors group/reply"
                                                onClick={() => scrollToMessage(replyingToMsg.id)}
                                            >
                                                <div className="w-8 border-t-2 border-l-2 border-slate-200 rounded-tl-md h-2 -ml-6 mt-2" />
                                                {(() => {
                                                    const replyUser = onlineUsers.find(u => u.id === replyingToMsg.user_id);
                                                    return replyUser?.avatar_url ? (
                                                        <img src={replyUser.avatar_url} className="w-4 h-4 rounded-full object-cover" alt="" />
                                                    ) : (
                                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${replyingToMsg.user_id}`} className="w-4 h-4 rounded-full" alt="" />
                                                    );
                                                })()}
                                                <span className="font-bold group-hover/reply:underline">@{replyingToMsg.user_name}</span>
                                                <span className="truncate max-w-[200px] italic">{replyingToMsg.message}</span>
                                            </div>
                                        )}

                                        {msg.attachment_url && Number(msg.is_deleted) !== 1 && (
                                            <div className="mt-2 mb-1">
                                                {msg.attachment_type?.startsWith('image/') ? (
                                                    <img src={msg.attachment_url} alt="Attachment" className="max-w-sm max-h-64 rounded-lg shadow-md border border-slate-200 hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => window.open(msg.attachment_url, '_blank')} />
                                                ) : msg.attachment_type?.startsWith('video/') ? (
                                                    <video src={msg.attachment_url} controls className="max-w-sm max-h-64 rounded-lg shadow-md border border-slate-200" />
                                                ) : (
                                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sapphire-600 underline text-sm font-bold flex items-center gap-2 bg-slate-100 p-2 rounded-lg max-w-fit">
                                                        Download Attachment
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {Number(msg.is_deleted) === 1 ? (
                                            <p className="text-sm italic text-rose-500 font-medium mt-1">this message was deleted by {msg.user_name}</p>
                                        ) : (
                                            <p className={cn(
                                                "leading-relaxed whitespace-pre-wrap break-words",
                                                isChained ? "" : "mt-1",
                                                isDarkMode ? "text-slate-100" : "text-slate-800"
                                            )}>
                                                {msg.message}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Scroll to Bottom Button */}
                <AnimatePresence>
                    {showScrollButton && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
                            className="absolute right-8 bottom-32 p-3 bg-sapphire-600 text-white rounded-full shadow-lg hover:bg-sapphire-700 transition-colors z-50 pointer-events-auto"
                        >
                            <ArrowDown className="w-5 h-5" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Chat Input Area */}
                <div className={cn("p-4 backdrop-blur-xl border-t transition-colors", isDarkMode ? "bg-slate-900/40 border-slate-700/60" : "bg-white/40 border-slate-200/60")}>
                    {!canChat ? (
                        <div className={cn("w-full py-4 rounded-xl text-center font-bold flex flex-col items-center justify-center", (isBannedFromChannel || isGloballyBanned) ? "bg-rose-50 text-rose-500 border border-rose-100" : "bg-slate-100 text-slate-400 border border-slate-200")}>
                            {isGloballyBanned ? (
                                <>
                                    <div className="flex items-center gap-2"><Ban className="w-5 h-5" /> You are globally banned</div>
                                    <div className="text-[10px] opacity-60 mt-1 font-medium">Reason: {globalBanReason}</div>
                                </>
                            ) : isBannedFromChannel ? (
                                <>
                                    <div className="flex items-center gap-2"><Ban className="w-5 h-5" /> You are banned from this channel</div>
                                    <div className="text-[10px] opacity-60 mt-1 font-medium">Reason: {bannedChannels[activeChannel] || 'No reason provided'}</div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                                    <Lock className="w-4 h-4" /> Read-Only Channel
                                </div>
                            )}
                        </div>
                    ) : (
                        viewMode === 'dms' && activeDM && isCurrentDMBlocked ? (
                            <div className="bg-rose-50/80 backdrop-blur-md p-4 rounded-xl border border-rose-200 text-center mx-4 my-2">
                                <p className="text-sm font-bold text-rose-600 flex items-center justify-center gap-2">
                                    <Ban className="w-4 h-4" /> Messaging is blocked between you and {activeDM.name}
                                </p>
                                <p className="text-[10px] text-rose-400 mt-1">Either you or {activeDM.name} has blocked the other.</p>
                                {blockedByMe.includes(activeDM.user_id) && (
                                    <button onClick={() => handleUnblockUserDM(activeDM.user_id)} className="mt-2 text-xs font-black text-sapphire-600 hover:underline px-3 py-1 rounded-full bg-sapphire-50 border border-sapphire-100">Unblock {activeDM.name}</button>
                                )}
                            </div>
                        ) : (
                            <>
                                {replyTo && (
                                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500 rounded-t-lg border-x border-t border-slate-200">
                                        <span>Replying to <span className="font-bold">@{replyTo.user_name}</span></span>
                                        <button onClick={() => setReplyTo(null)} className="hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                )}
                                {editingMessage && (
                                    <div className="flex items-center justify-between bg-rose-500 px-4 py-2 text-xs text-white rounded-t-lg border-x border-t border-rose-600 shadow-inner">
                                        <span className="flex items-center gap-2 animate-pulse"><Edit3 className="w-3 h-3" /> Editing message from <span className="font-black underline">@{editingMessage.user_name}</span></span>
                                        <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="bg-white/20 hover:bg-white/40 px-2 py-0.5 rounded font-black transition-colors">CANCEL EDIT</button>
                                    </div>
                                )}
                                <form onSubmit={(e) => handleSend(e)} className={cn("backdrop-blur-xl p-2.5 flex items-center gap-4 relative transition-colors", isDarkMode ? "bg-slate-800/50 border border-slate-700" : "bg-white/40 border border-white/20", (replyTo || editingMessage) ? "rounded-b-lg border-t-0" : "rounded-lg")}>
                                    <div className={cn("flex items-center gap-3 px-2 border-r pr-4", isDarkMode ? "border-slate-700" : "border-slate-300/50")}>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer transition-all shadow-sm",
                                                isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-400 hover:bg-slate-500"
                                            )}
                                        >
                                            <Plus className="w-5 h-5" strokeWidth={3} />
                                        </div>
                                    </div>
                                    <input
                                        className={cn("flex-1 bg-transparent border-none outline-none font-medium h-full min-w-0 transition-colors", isDarkMode ? "text-slate-100 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400")}
                                        placeholder={viewMode === 'dms' && activeDM ? `Message @${activeDM.name}` : `Message #${activeChannel}`}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <div className="flex items-center gap-3 px-2 border-l border-slate-300/50 pl-4 relative">
                                        {/* Emoji Picker */}
                                        <AnimatePresence>
                                            {showEmojiPicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute bottom-12 right-0 bg-white shadow-2xl rounded-2xl p-3 w-64 border border-slate-200 grid grid-cols-6 gap-2 z-50 max-h-60 overflow-y-auto"
                                                >
                                                    {[
                                                        '🤒', '🏥', '🩺', '💊', '💉', '🩸', '🦠', '🧼', '🩹', '🚑', '🛌', '🧘', '🏋️', '🍎', '🥗', '🥤', // Medical First
                                                        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '🤪', '😜', '😝', '😛', '🤑', '😎', '🤓', '🧐', '🤠', '🥳', '🤡', '😏', '😶', '😐', '😑', '😒', '🙄', '🤨', '🤔', '🤫', '🤭', '🤥', '😳', '😞', '😟', '😠', '😡', '🤬', '🤯', '🥶', '🥵', '😱', '😨', '😰', '😥', '😓', '🤗', '🤥', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
                                                    ].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => {
                                                                setNewMessage(prev => prev + emoji);
                                                                setShowEmojiPicker(false);
                                                            }}
                                                            className="text-xl hover:bg-slate-100 rounded-lg p-1 transition-colors"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Gift / Sticker Picker */}
                                        <AnimatePresence>
                                            {showGiftPicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute bottom-12 right-0 bg-white shadow-2xl rounded-2xl p-3 w-72 border border-slate-200 z-50"
                                                >
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Send a Sticker</h4>
                                                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                                                        {[
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGZ4eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/McV2Vd9FZM6G2sZtQ8/giphy.gif', // Get Well Soon
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/MDJ9IbxxvDUQM/giphy.gif', // Cat Doctor
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l2JJyDYFVc5pG58lO/giphy.gif', // Nurse High Five
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xT0BKiK5sOCUq0oTEk/giphy.gif', // Pills
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o6Zt6MLGDs5M0ijZu/giphy.gif', // Stay Healthy
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0MYt5jPR6QX5pnqM/giphy.gif', // Fruit/Veggies
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/LpDmM2wSt6MfM2FP5b/giphy.gif', // Cat High Five
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l4KibWpBGWchSqCRy/giphy.gif', // Thumbs up
                                                            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6eWJ3eHByb3B5b3EzZ3hid3dwb3B5b3EzZ3hid3dwb3B5b3EzZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif', // Party
                                                        ].map((sticker, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={sticker}
                                                                alt="sticker"
                                                                className="w-full h-auto cursor-pointer hover:scale-110 transition-transform p-1 rounded-lg hover:bg-slate-100"
                                                                onClick={() => {
                                                                    handleSend(undefined, sticker, 'image/gif');
                                                                    setShowGiftPicker(false);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <Gift
                                            onClick={() => { setShowGiftPicker(!showGiftPicker); setShowEmojiPicker(false); }}
                                            className={cn(
                                                "w-6 h-6 cursor-pointer transition-colors",
                                                showGiftPicker
                                                    ? "text-sapphire-700"
                                                    : isDarkMode ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                            )}
                                            strokeWidth={2.5}
                                        />
                                        <Smile
                                            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGiftPicker(false); }}
                                            className={cn(
                                                "w-6 h-6 cursor-pointer transition-colors",
                                                showEmojiPicker
                                                    ? "text-amber-600"
                                                    : isDarkMode ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                            )}
                                            strokeWidth={2.5}
                                        />
                                        <button
                                            type="submit"
                                            disabled={(!newMessage.trim() && !isSending) || !canChat}
                                            className={cn(
                                                "transition-all duration-200 p-2 rounded-full",
                                                (newMessage.trim() || isSending)
                                                    ? "text-sapphire-700 hover:bg-sapphire-100 cursor-pointer scale-110"
                                                    : "text-slate-400 cursor-not-allowed opacity-50"
                                            )}
                                        >
                                            <Send className="w-6 h-6" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </form>
                            </>
                        )
                    )}
                </div>
            </div>

            {/* 4. Member List (Right) - Enhanced for Mobile */}
            <AnimatePresence>
                {showMobileMembers && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] bg-black/40 lg:hidden"
                        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                        onClick={() => setShowMobileMembers(false)}
                    />
                )}
            </AnimatePresence>

            {
                (showMobileMembers || window.innerWidth >= 1024) && (
                    <div className={cn(
                        "w-64 bg-white/10 backdrop-blur-3xl border-l border-white/10 flex flex-col p-4 z-[80] h-full",
                        "fixed right-0 top-0 bottom-0 shadow-2xl lg:shadow-none lg:static lg:flex lg:z-10 transition-transform duration-300",
                        !showMobileMembers && "hidden lg:flex"
                    )}>
                        <div className="flex items-center justify-between lg:hidden mb-6">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Members</h4>
                            <button onClick={() => setShowMobileMembers(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Plus className="w-5 h-5 rotate-45 text-slate-500" /></button>
                        </div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex-shrink-0">All Users — {onlineUsers.length}</h4>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 min-h-0">
                            {onlineUsers.map((member, idx) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className={cn(
                                        "flex items-center gap-3 p-2 hover:bg-sapphire-50 border border-transparent hover:border-sapphire-200 rounded-xl cursor-pointer opacity-80 hover:opacity-100 transition-all hover:shadow-sm group",
                                        (member.banned_until || member.is_banned_in_channel) ? "bg-rose-50 hover:bg-rose-100 border-rose-100" : ""
                                    )}
                                    onContextMenu={(e) => handleContextMenu(e, 'user', member)}
                                >
                                    <div className="relative">
                                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs truncate shadow-sm group-hover:scale-105 transition-transform overflow-hidden",
                                            (member.banned_until || member.is_banned_in_channel) ? "bg-rose-600" : (member.id === 101 ? "bg-rose-500" : "bg-gradient-to-br from-slate-400 to-slate-500")
                                        )}>
                                            {(member.banned_until || member.is_banned_in_channel) ? (
                                                <Ban className="w-4 h-4" />
                                            ) : member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                            ) : (
                                                member.name?.[0]
                                            )}
                                        </div>
                                        {!(member.banned_until || member.is_banned_in_channel) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h5 className={cn("text-sm font-bold leading-none truncate transition-colors", (member.banned_until || member.is_banned_in_channel) ? "text-rose-600" : "text-slate-700 group-hover:text-sapphire-700")}>{member.name}</h5>
                                        <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-tighter">{member.role || 'Member'}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Custom Toast System */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={cn(
                            "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border backdrop-blur-md",
                            toast.type === 'success' ? "bg-emerald-500/90 text-white border-emerald-400/50" :
                                toast.type === 'error' ? "bg-rose-500/90 text-white border-rose-400/50" :
                                    "bg-slate-900/90 text-white border-white/10"
                        )}
                    >
                        {toast.type === 'success' && <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">✓</div>}
                        {toast.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {confirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4"
                        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 border border-slate-200 overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sapphire-500 to-indigo-500" />
                            <h3 className="text-xl font-black text-slate-800 mb-2">Are you sure?</h3>
                            <p className="text-slate-500 font-medium mb-6 leading-relaxed">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        confirmModal.onConfirm();
                                        setConfirmModal(null);
                                    }}
                                    className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CommunityChat;
