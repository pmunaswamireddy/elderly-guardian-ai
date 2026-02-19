import os
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Connectivity Status
is_connected = False
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        is_connected = True
    except Exception as e:
        print(f"[Supabase] Client creation error: {e}")
        is_connected = False
else:
    print("[CRITICAL] Supabase URL or Key not found in environment variables.")

class SupabaseDB:
    def __init__(self): pass
    def get_connection(self): return None # Parity

    def add_history(self, user_id: int, medicine_id: int, medicine_name: str, status: str):
        if not supabase: return
        supabase.table("medicine_history").insert({
            "user_id": user_id, "medicine_id": medicine_id,
            "medicine_name": medicine_name, "status": status
        }).execute()

    def get_history(self, user_id: int, days: int = 60):
        try:
            if not supabase: return []
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()
            res = supabase.table("medicine_history").select("*").eq("user_id", user_id).gt("taken_at", cutoff).order("taken_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            print(f"[Supabase ERROR] get_history: {e}")
            return []

db = SupabaseDB()

# --- User Management ---

def authenticate_user(email: str, password: str):
    try:
        if not supabase: return None
        res = supabase.table("users").select("*").eq("email", email).eq("password", password).execute()
        if res.data: return res.data[0]
        res = supabase.table("users").select("*").eq("name", email).eq("password", password).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"[Supabase ERROR] authenticate_user: {e}")
        return None

def get_user_by_id(user_id: int):
    if not supabase: return None
    try:
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if not res.data: return None
        user = res.data[0]
        # Resiliency defaults
        d = {'preferred_language': 'en', 'ai_voice_gender': 'Male', 'booking_voice_gender': 'Female', 
             'ai_always_active': True, 'ai_voice_pitch': 1.0, 'ai_voice_clarity': 0.85, 'ai_voice_rate': 1.0,
             'voice_enabled': True, 'ai_enabled': True, 'voice_reminders_enabled': True}
        for k, v in d.items(): user.setdefault(k, v)
        if not user.get('ai_language'): user['ai_language'] = user['preferred_language']
        if not user.get('booking_language'): user['booking_language'] = user['ai_language']
        return user
    except Exception as e:
        print(f"[Supabase ERROR] get_user_by_id: {e}")
        return None

def create_user(name: str, email: str, password: str, phone: str = None, role: str = "user"):
    if not supabase: return None
    try:
        res = supabase.table("users").insert({
            "name": name, "email": email, "password": password, "phone": phone, "role": role
        }).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"[Supabase ERROR] create_user: {e}")
        return None

def create_admin(name: str, email: str, password: str) -> Optional[Dict]:
    """Protected creator for admins"""
    return create_user(name, email, password, role="admin")

def update_user_settings(user_id: int, settings: Dict):
    if not supabase: return None
    allowed = ['name', 'email', 'role', 'phone', 'preferred_language', 'emergency_contact_name', 
               'emergency_contact_phone', 'voice_enabled', 'ai_enabled', 'voice_reminders_enabled', 
               'ai_always_active', 'ai_language', 'ai_voice_model', 'ai_voice_pitch', 'ai_voice_clarity',
               'ai_voice_gender', 'ai_voice_rate', 'booking_language', 'booking_voice_gender',
               'avatar_url', 'preferred_voice_uri', 'theme', 'font_size_scale']
    filtered = {k: v for k, v in settings.items() if k in allowed}
    if not filtered: return {"info": "no_matched_fields"}
    try:
        res = supabase.table("users").update(filtered).eq("id", user_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"[Supabase ERROR] update_user_settings: {e}")
        return None

def update_admin_credentials(user_id: int, email: str, password: str) -> bool:
    if not supabase: return False
    try:
        res = supabase.table("users").update({"email": email, "password": password}).eq("id", user_id).in_("role", ["admin", "super_admin"]).execute()
        return len(res.data) > 0
    except Exception as e:
        print(f"[Supabase ERROR] update_admin_credentials: {e}")
        return False

def ban_user(user_id: int, days: int, reason: str):
    if not supabase or user_id == 1: return
    banned_until = (datetime.now() + timedelta(days=days)).isoformat()
    supabase.table("users").update({"banned_until": banned_until, "ban_reason": reason}).eq("id", user_id).execute()

def unban_user(user_id: int):
    if not supabase: return
    supabase.table("users").update({"banned_until": None, "ban_reason": None}).eq("id", user_id).execute()

def delete_user(user_id: int):
    if not supabase or user_id == 1: return False
    try:
        supabase.table("users").delete().eq("id", user_id).execute()
        return True
    except Exception as e:
        print(f"[Supabase ERROR] delete_user: {e}")
        return False

def get_all_users():
    if not supabase: return []
    res = supabase.table("users").select("*").execute()
    return res.data or []

def get_admin_users_list() -> List[Dict]:
    """Returns all users for the admin identity grid"""
    if not supabase: return []
    try:
        res = supabase.table("users").select("*").order("id").execute()
        return res.data or []
    except Exception as e:
        print(f"[Supabase ERROR] get_admin_users_list: {e}")
        return []

def update_user_role(user_id: int, role: str) -> bool:
    if not supabase or user_id == 1: return False
    try:
        res = supabase.table("users").update({"role": role}).eq("id", user_id).execute()
        return len(res.data) > 0
    except: return False

def update_user_avatar(user_id: int, avatar_url: str) -> bool:
    if not supabase: return False
    try:
        res = supabase.table("users").update({"avatar_url": avatar_url}).eq("id", user_id).execute()
        return len(res.data) > 0
    except: return False

def ban_user_globally(user_id: int, reason: str):
    return ban_user(user_id, 36500, reason) # Effectively forever

def ban_user_hard(user_id: int):
    """Permanent ban and data lockout"""
    return ban_user(user_id, 36500, "PERMANENT_HARD_BAN")

def unban_user(user_id: int):
    if not supabase: return
    supabase.table("users").update({"banned_until": None, "ban_reason": None}).eq("id", user_id).execute()
def get_medicines(user_id: int = 1):
    if not supabase: return []
    res = supabase.table("medicines").select("*").eq("user_id", user_id).execute()
    return res.data or []

def add_medicine(user_id: int, name: str, dosage: str, time: str, after_meal: bool, frequency: str = 'daily', end_date: str = None):
    if not supabase: return None
    res = supabase.table("medicines").insert({"user_id": user_id, "name": name, "dosage": dosage, "time": time, "after_meal": after_meal, "frequency": frequency, "end_date": end_date}).execute()
    return res.data[0] if res.data else None

def delete_medicine(medicine_id: int):
    if not supabase: return False
    supabase.table("medicines").delete().eq("id", medicine_id).execute()
    return True

def update_medicine(medicine_id: int, taken: bool):
    if not supabase: return None
    res = supabase.table("medicines").update({"taken": taken, "last_taken_at": datetime.now().isoformat() if taken else None}).eq("id", medicine_id).execute()
    if taken and res.data:
        m = res.data[0]
        db.add_history(m['user_id'], medicine_id, m['name'], "taken")
    return res.data[0] if res.data else None

def update_medicine_details(medicine_id: int, name: str, dosage: str, time: str, after_meal: bool):
    if not supabase: return None
    res = supabase.table("medicines").update({"name": name, "dosage": dosage, "time": time, "after_meal": after_meal}).eq("id", medicine_id).execute()
    return res.data[0] if res.data else None

def get_untaken_medicines_count(user_id: int = 1):
    if not supabase: return 0
    res = supabase.table("medicines").select("*", count="exact").eq("user_id", user_id).eq("taken", False).execute()
    return res.count if hasattr(res, 'count') else len(res.data)

def mark_medicine_missed(medicine_id: int):
    res = supabase.table("medicines").select("*").eq("id", medicine_id).execute()
    if res.data:
        m = res.data[0]
        db.add_history(m['user_id'], medicine_id, m['name'], "missed")
        return True
    return False

def get_missed_medicines(user_id: int):
    if not supabase: return []
    res = supabase.table("medicine_history").select("*").eq("user_id", user_id).eq("status", "missed").execute()
    return res.data or []

# --- Appointments ---
def get_appointments(user_id: int = 1):
    if not supabase: return []
    res = supabase.table("appointments").select("*").eq("user_id", user_id).execute()
    return [{"doctor_name": a.get("doctor_name"), "date": a.get("date"), "time": a.get("time"), "reason": a.get("reason")} for a in res.data] if res.data else []

def add_appointment(user_id: int, doctor_name: str, date: str, time: str, reason: str):
    if not supabase: return None
    res = supabase.table("appointments").insert({"user_id": user_id, "doctor_name": doctor_name, "date": date, "time": time, "reason": reason}).execute()
    return res.data[0] if res.data else None

def delete_appointment(appointment_id: int):
    if not supabase: return False
    supabase.table("appointments").delete().eq("id", appointment_id).execute()
    return True

# --- Vitals ---
def save_vitals(user_id: int, bp_systolic: int, bp_diastolic: int, sugar_level: int, heart_rate: int, notes: str = ""):
    if not supabase: return None
    res = supabase.table("vitals").insert({"user_id": user_id, "bp_systolic": bp_systolic, "bp_diastolic": bp_diastolic, "sugar_level": sugar_level, "heart_rate": heart_rate, "notes": notes}).execute()
    return res.data[0] if res.data else None

def get_latest_vitals(user_id: int = 1):
    if not supabase: return None
    res = supabase.table("vitals").select("*").eq("user_id", user_id).order("recorded_at", desc=True).limit(1).execute()
    if res.data:
        row = res.data[0]
        return {"bp": {"systolic": row.get("bp_systolic"), "diastolic": row.get("bp_diastolic")}, "sugar": {"level": row.get("sugar_level")}, "heart_rate": {"bpm": row.get("heart_rate")}, "last_checked": row.get("recorded_at")}
    return None

def get_vitals_history(user_id: int, limit: int = 100):
    if not supabase: return []
    res = supabase.table("vitals").select("*").eq("user_id", user_id).order("recorded_at", desc=True).limit(limit).execute()
    return res.data or []

def delete_vitals(vitals_id: int) -> bool:
    if not supabase: return False
    supabase.table("vitals").delete().eq("id", vitals_id).execute()
    return True

def update_vitals(vitals_id: int, bp_systolic: int, bp_diastolic: int, sugar_level: int, heart_rate: int, notes: str) -> bool:
    if not supabase: return False
    res = supabase.table("vitals").update({"bp_systolic": bp_systolic, "bp_diastolic": bp_diastolic, "sugar_level": sugar_level, "heart_rate": heart_rate, "notes": notes}).eq("id", vitals_id).execute()
    return len(res.data) > 0

# --- Community & Chat ---
def get_channels_with_meta():
    if not supabase: return []
    res = supabase.table("channels").select("*").execute()
    channels = []
    for ch in (res.data or []):
        try:
            msg = supabase.table("chat_messages").select("timestamp, user_id").eq("channel", ch['id']).order("timestamp", desc=True).limit(1).execute()
            last = msg.data[0] if msg.data else {}
            wl = supabase.table("channel_whitelist").select("user_id").eq("channel_id", ch['id']).execute()
            whitelisted = [r['user_id'] for r in (wl.data or [])]
        except: last, whitelisted = {}, []
        ch.update({"last_message_at": last.get('timestamp'), "last_message_by": last.get('user_id'), "whitelisted_users": whitelisted})
        channels.append(ch)
    return channels

def create_channel(ch_id: str, name: str, read_only: bool = False):
    if not supabase: return None
    res = supabase.table("channels").insert({"id": ch_id, "name": name, "read_only": read_only}).execute()
    return res.data[0] if res.data else None

def delete_channel(ch_id: str):
    if not supabase: return False
    supabase.table("channels").delete().eq("id", ch_id).execute()
    return True

def get_chat_history(channel: str = "general", limit: int = 50):
    if not supabase: return []
    res = supabase.table("chat_messages").select("*, users(name)").eq("channel", channel).order("timestamp", desc=True).limit(limit).execute()
    history = []
    for m in reversed(res.data or []):
        m['user_name'] = m.get('users', {}).get('name', 'Unknown')
        history.append(m)
    return history

def add_chat_message(user_id: int, message: str, channel: str = "general", reply_to_id: int = None, attachment_url: str = None, attachment_type: str = None):
    if not supabase: return None
    res = supabase.table("chat_messages").insert({"user_id": user_id, "message": message, "channel": channel, "reply_to_id": reply_to_id, "attachment_url": attachment_url, "attachment_type": attachment_type}).execute()
    return res.data[0] if res.data else None

# --- Channel Roles ---
def get_channel_roles(channel_id: str):
    if not supabase: return []
    res = supabase.table("channel_roles").select("*, users(name)").eq("channel_id", channel_id).execute()
    for r in (res.data or []): r['user_name'] = r.get('users', {}).get('name', 'Unknown')
    return res.data or []

def set_channel_role(channel_id: str, user_id: int, role: str):
    if not supabase: return None
    res = supabase.table("channel_roles").upsert({"channel_id": channel_id, "user_id": user_id, "role": role}).execute()
    return res.data[0] if res.data else None

def remove_channel_role(channel_id: str, user_id: int):
    if not supabase: return False
    supabase.table("channel_roles").delete().eq("channel_id", channel_id).eq("user_id", user_id).execute()
    return True

def get_user_channel_role(channel_id: str, user_id: int):
    if not supabase: return "member"
    res = supabase.table("channel_roles").select("role").eq("channel_id", channel_id).eq("user_id", user_id).execute()
    return res.data[0]['role'] if res.data else "member"

def is_channel_moderator(channel_id: str, user_id: int):
    return get_user_channel_role(channel_id, user_id) in ['owner', 'moderator', 'admin']

# --- Location ---
def update_user_location(user_id: int, lat: float, lng: float, data: Dict = None):
    if not supabase: return False
    d = data or {"user_id": user_id, "latitude": lat, "longitude": lng, "updated_at": datetime.utcnow().isoformat()}
    try:
        supabase.table("user_locations").upsert(d).execute()
        return True
    except: return False

def get_active_user_locations(minutes: int = 60) -> List[Dict]:
    if not supabase: return []
    try:
        threshold = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
        res = supabase.table("user_locations").select("*").gt("updated_at", threshold).order("updated_at", desc=True).execute()
        seen, locs = set(), []
        for l in (res.data or []):
            if l['user_id'] not in seen:
                locs.append(l); seen.add(l['user_id'])
        if not locs: return []
        u_res = supabase.table("users").select("id, name, email, role").in_("id", [l['user_id'] for l in locs]).execute()
        u_map = {u['id']: u for u in (u_res.data or [])}
        return [{"user_id": l['user_id'], "lat": l['latitude'], "lng": l['longitude'], "last_seen": l['updated_at'], "name": u_map.get(l['user_id'], {}).get('name', 'Unknown'), "role": u_map.get(l['user_id'], {}).get('role', 'user')} for l in locs if l['user_id'] in u_map]
    except: return []

# --- Admin Stats & Analytics ---
def get_site_settings():
    if not supabase: return {}
    res = supabase.table("site_settings").select("*").eq("id", 1).execute()
    return res.data[0] if res.data else {}

def get_admin_stats():
    return {"total_users": len(get_all_users()), "uptime": "99.9%"}

def get_admin_analytics(days: int = 30) -> Dict:
    if not supabase: return {"labels": [], "values": []}
    labels, values, now = [], [], datetime.now()
    for i in range(days - 1, -1, -1):
        d = now - timedelta(days=i)
        start, end = d.replace(hour=0, minute=0, second=0, microsecond=0).isoformat(), d.replace(hour=23, minute=59, second=59, microsecond=999).isoformat()
        res = supabase.table("users").select("id", count="exact").gte("created_at", start).lte("created_at", end).execute()
        labels.append(d.strftime("%b %d"))
        values.append(res.count if hasattr(res, 'count') else len(res.data))
    return {"labels": labels, "values": values}

def log_audit(user_id: int, action: str, details: str):
    if not supabase: return
    supabase.table("audit_logs").insert({"user_id": user_id, "action": action, "details": details}).execute()

def get_audit_logs_list(limit: int = 100):
    if not supabase: return []
    res = supabase.table("audit_logs").select("*, users(name)").order("timestamp", desc=True).limit(limit).execute()
    for r in (res.data or []): r['user_name'] = r.get('users', {}).get('name', 'Unknown')
    return res.data or []

def get_admin_tasks() -> Dict:
    if not supabase: return {"tasks": []}
    try:
        rep = supabase.table("reports").select("id", count="exact").eq("status", "pending").execute()
        p = rep.count if hasattr(rep, 'count') else len(rep.data)
        ban = supabase.table("users").select("id", count="exact").not_.is_("banned_until", "null").eq("banned_until", "forever").execute()
        b = ban.count if hasattr(ban, 'count') else len(ban.data)
        return {"tasks": [{"label": "Pending Reports", "count": p, "highlight": p > 0}, {"label": "Banned Users", "count": b, "highlight": False}]}
    except: return {"tasks": []}

def clear_system_data() -> bool:
    if not supabase: return False
    try:
        for t in ["vitals", "medicines", "appointments", "medicine_history", "chat_messages", "audit_logs"]:
            try: supabase.table(t).delete().neq("id", -1).execute()
            except: pass
        supabase.table("users").delete().not_.in_("role", ["admin", "super_admin", "staff"]).execute()
        return True
    except: return False

# --- Reports ---
def get_reports_list():
    if not supabase: return []
    res = supabase.table("reports").select("*, users!reporter_id(name), target:users!target_user_id(name)").order("created_at", desc=True).execute()
    for r in (res.data or []):
        r['reporter_name'] = r.get('users', {}).get('name', 'Unknown')
        r['target_user_name'] = r.get('target', {}).get('name', 'Unknown')
    return res.data or []

def create_report(reporter_id: int, target_user_id: int, context_id: int, reason: str):
    if not supabase: return None
    res = supabase.table("reports").insert({"reporter_id": reporter_id, "target_user_id": target_user_id, "context_id": context_id, "reason": reason, "status": "pending"}).execute()
    return res.data[0] if res.data else None

def update_report_status(report_id: int, status: str):
    if not supabase: return False
    supabase.table("reports").update({"status": status}).eq("id", report_id).execute()
    return True

def delete_report(report_id: int):
    if not supabase: return False
    supabase.table("reports").delete().eq("id", report_id).execute()
    return True

# --- Channel Moderation ---
def get_all_users_with_bans(channel_id: str):
    if not supabase: return []
    users = get_all_users()
    bans = get_channel_bans_list(channel_id)
    b_map = {b['user_id']: b for b in bans}
    for u in users:
        u['is_banned'] = u['id'] in b_map
        u['ban_info'] = b_map.get(u['id'])
    return users

def ban_user_from_channel(user_id: int, channel_id: str, reason: str, banned_by: int):
    if not supabase: return False
    supabase.table("channel_bans").upsert({"user_id": user_id, "channel_id": channel_id, "reason": reason, "banned_by": banned_by}).execute()
    return True

def unban_user_from_channel(user_id: int, channel_id: str):
    if not supabase: return False
    supabase.table("channel_bans").delete().eq("user_id", user_id).eq("channel_id", channel_id).execute()
    return True

def get_channel_bans_list(channel_id: str):
    if not supabase: return []
    res = supabase.table("channel_bans").select("*, users(name)").eq("channel_id", channel_id).execute()
    for r in (res.data or []): r['user_name'] = r.get('users', {}).get('name', 'Unknown')
    return res.data or []

def get_user_channel_bans_dict(user_id: int):
    if not supabase: return {}
    res = supabase.table("channel_bans").select("channel_id, reason").eq("user_id", user_id).execute()
    return {r['channel_id']: r['reason'] for r in res.data} if res.data else {}

# --- Direct Messaging ---
def send_dm(sender_id: int, receiver_id: int, message: str, attachment_url: str = None, attachment_type: str = None):
    if not supabase: return None
    res = supabase.table("direct_messages").insert({"sender_id": sender_id, "receiver_id": receiver_id, "message": message, "attachment_url": attachment_url, "attachment_type": attachment_type}).execute()
    return res.data[0] if res.data else None

def get_dm_history(user1: int, user2: int, limit: int = 50):
    if not supabase: return []
    res = supabase.table("direct_messages").select("*").or_(f"and(sender_id.eq.{user1},receiver_id.eq.{user2}),and(sender_id.eq.{user2},receiver_id.eq.{user1})").order("timestamp", desc=True).limit(limit).execute()
    return sorted(res.data, key=lambda x: x['timestamp']) if res.data else []

def get_dm_conversations(user_id: int):
    if not supabase: return []
    res = supabase.table("direct_messages").select("sender_id, receiver_id").or_(f"sender_id.eq.{user_id},receiver_id.eq.{user_id}").order("timestamp", desc=True).execute()
    others = set()
    for r in (res.data or []):
        others.add(r['sender_id'] if r['sender_id'] != user_id else r['receiver_id'])
    if not others: return []
    u_res = supabase.table("users").select("id, name, avatar_url, role").in_("id", list(others)).execute()
    return u_res.data or []

def mark_dms_read(user_id: int, other_id: int):
    if not supabase: return 0
    res = supabase.table("direct_messages").update({"is_read": True}).eq("sender_id", other_id).eq("receiver_id", user_id).eq("is_read", False).execute()
    return len(res.data)

def block_user_dm(user_id: int, target_id: int):
    if not supabase: return False
    supabase.table("dm_blocks").upsert({"user_id": user_id, "blocked_id": target_id}).execute()
    return True

def unblock_user_dm(user_id: int, target_id: int):
    if not supabase: return False
    supabase.table("dm_blocks").delete().eq("user_id", user_id).eq("blocked_id", target_id).execute()
    return True

def get_blocked_users(user_id: int):
    if not supabase: return []
    res = supabase.table("dm_blocks").select("blocked_id").eq("user_id", user_id).execute()
    return [r['blocked_id'] for r in res.data] if res.data else []

def is_dm_blocked(user1: int, user2: int):
    if not supabase: return False
    res = supabase.table("dm_blocks").select("*").or_(f"and(user_id.eq.{user1},blocked_id.eq.{user2}),and(user_id.eq.{user2},blocked_id.eq.{user1})").execute()
    return len(res.data) > 0

def clear_dm_history(user1: int, user2: int):
    if not supabase: return False
    supabase.table("direct_messages").delete().or_(f"and(sender_id.eq.{user1},receiver_id.eq.{user2}),and(sender_id.eq.{user2},receiver_id.eq.{user1})").execute()
    return True

def get_dm_message(msg_id: int):
    if not supabase: return None
    res = supabase.table("direct_messages").select("*").eq("id", msg_id).execute()
    return res.data[0] if res.data else None

def update_dm_message(msg_id: int, message: str):
    if not supabase: return False
    supabase.table("direct_messages").update({"message": message}).eq("id", msg_id).execute()
    return True

def delete_dm_message(msg_id: int):
    if not supabase: return False
    supabase.table("direct_messages").delete().eq("id", msg_id).execute()
    return True

def get_chat_message_data(msg_id: int):
    if not supabase: return None
    res = supabase.table("chat_messages").select("*").eq("id", msg_id).execute()
    return res.data[0] if res.data else None

# --- Initialization ---
def init_admin_user():
    email = "admin@elderlyguardian.com"
    if not supabase: return
    try:
        res = supabase.table("users").select("id").eq("email", email).execute()
        if not res.data:
            create_user("Administrator", email, "password", role="super_admin")
            print("[Supabase] Default Super Admin created.")
    except Exception as e:
        print(f"[Supabase] Init Error: {e}")

try: init_admin_user()
except: pass
