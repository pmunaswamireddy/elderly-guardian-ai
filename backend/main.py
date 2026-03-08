from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import random
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from typing import List, Optional
import os
import sqlite3
from fuzzywuzzy import fuzz
import edge_tts
from fastapi.responses import StreamingResponse
import io
import httpx
import json
import base64
import re
import traceback
from groq import Groq
from mistralai import Mistral as MistralClient
from google import genai
from PIL import Image

from dotenv import load_dotenv
load_dotenv()

# Neural Voice Mapping (Microsoft Edge Voices)
NEURAL_VOICES = {
    'en': 'en-US-ChristopherNeural', # High quality English
    'hi': 'hi-IN-SwaraNeural',       # High quality Hindi
    'ta': 'ta-IN-PallaviNeural',     # Tamil
    'te': 'te-IN-ShrutiNeural',      # Telugu
    'kn': 'kn-IN-GaganNeural',       # Kannada
    'ml': 'ml-IN-SobhanaNeural',     # Malayalam
    'gu': 'gu-IN-DhwaniNeural',      # Gujarati
    'bn': 'bn-IN-TanishaaNeural',    # Bengali
    'mr': 'mr-IN-AarohiNeural',      # Marathi
    'pa': 'pa-IN-WaseemNeural',        # Punjabi
    'ur': 'ur-IN-GulshanNeural',     # Urdu
    'or': 'or-IN-SubhashiniNeural',  # Odia
    # Fallbacks / Extras
    'en-US': 'en-US-ChristopherNeural',
    'en-IN': 'en-IN-NeerjaNeural'
}

# CONFIG: API Keys
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or ""   # https://openrouter.ai – free signup, 200 req/min free
MISTRAL_API_KEY    = os.getenv("MISTRAL_API_KEY")    or ""   # https://console.mistral.ai – free tier

genai_client = None
if GEMINI_API_KEY:
    genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Switchable Database Implementation with Automatic Failover
USE_SUPABASE = os.getenv("USE_SUPABASE", "false").lower() == "true"

if USE_SUPABASE:
    print("[INIT] Attempting to use Supabase Database...")
    import database_supabase as db_ops
    if not db_ops.is_connected:
        print("\n" + "!"*60)
        print("[FAILOVER] Supabase connection FAILED or DNS resolution unreachable.")
        print("[FAILOVER] Falling back to local SQLite database (database_simple.py).")
        print("!"*60 + "\n")
        import database_simple as db_ops
        USE_SUPABASE = False
    else:
        print("[INIT] Supabase connection verified.")
else:
    print("[INIT] Using SQLite Database")
    import database_simple as db_ops

# Language name mapping for AI prompts
LANG_NAME_MAP = {
    'en': 'English', 'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil',
    'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali', 'gu': 'Gujarati',
    'mr': 'Marathi', 'pa': 'Punjabi', 'or': 'Odia', 'ur': 'Urdu'
}

# Helper for Model Failover (Production Reliability)
# Reusable HTTP client to avoid SSL handshake overhead on every call
http_client = httpx.AsyncClient()

async def call_ai_agent(messages, temperature=0.1, timeout=30.0):
    """
    6-Tier AI Failover Chain (all free tiers):
      1. Gemini 2.0 Flash         – Google AI Studio (1500 req/day free)
      2. DeepSeek R1              – OpenRouter free  (:free, top reasoning model)
      3. Qwen 2.5-72B             – OpenRouter free  (:free, strong multilingual)
      4. Groq Llama 3.3-70B      – Groq free (6000 req/day)
      5. Mistral Small 2409       – Mistral free tier
      6. Groq Llama 3.1-8B       – Groq fallback
    """
    import asyncio

    # ── Tier 1: Gemini Direct (FREE · 1500 req/day) ──
    if genai_client:
        gemini_models = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
        ]
        gemini_prompt = ""
        for msg in messages:
            gemini_prompt += f"{msg['role'].upper()}: {msg['content']}\n"

        for model_name in gemini_models:
            try:
                print(f"[AI Tier-1] Gemini → {model_name}")
                gen_response = await asyncio.to_thread(
                    genai_client.models.generate_content,
                    model=model_name,
                    contents=gemini_prompt
                )
                if gen_response and gen_response.text:
                    print(f"[AI ✓] Gemini {model_name} success.")
                    return {"choices": [{"message": {"content": gen_response.text}}]}
            except Exception as ge:
                err = str(ge)
                print(f"[AI Tier-1] {model_name} failed: {err[:120]}")
                continue

    # ── Tier 2 & 3: OpenRouter Free Models (Resilient Mix) ──
    if OPENROUTER_API_KEY:
        openrouter_models = [
            "deepseek/deepseek-r1-0528:free",         # Reasoning (Free)
            "qwen/qwen3-coder:free",                # Powerful Coding/Reasoning (Free)
            "google/gemma-3-27b-it:free",            # Large Context (Free)
            "meta-llama/llama-3.3-70b-instruct:free", # Stable Fallback (Free)
            "liquid/lfm-2.5-1.2b-instruct:free",     # Fast (Free)
            "nvidia/nemotron-nano-12b-v2-vl:free",  # Alternative (Free)
        ]
        for or_model in openrouter_models:
            try:
                print(f"[AI Tier-2] OpenRouter → {or_model}")
                response = await http_client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "HTTP-Referer": "https://guardian-ai.app",
                        "X-Title": "Elderly Guardian AI",
                    },
                    json={"model": or_model, "messages": messages, "temperature": temperature},
                    timeout=timeout,
                )
                if response.status_code < 400:
                    data = response.json()
                    if data.get("choices"):
                        print(f"[AI ✓] OpenRouter {or_model} success.")
                        return data
                else:
                    print(f"[AI Tier-2] {or_model} HTTP {response.status_code} - {response.text[:100]}")
            except Exception as e:
                print(f"[AI Tier-2] {or_model} error: {str(e)[:100]}")
                continue

    # ── Tier 4: Groq Models (Fast & Free) ──
    groq_models = [
        "llama-3.3-70b-versatile",
        "llama-3-70b-8192",
        "mixtral-8x7b-32768",
        "llama-3.1-8b-instant",
    ]
    for gm in groq_models:
        try:
            print(f"[AI Tier-4] Groq → {gm}")
            response = await http_client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={"model": gm, "messages": messages, "temperature": temperature},
                timeout=timeout,
            )
            if response.status_code < 400:
                print(f"[AI ✓] Groq {gm} success.")
                return response.json()
        except Exception as e:
            print(f"[AI Tier-4] {gm} error: {e}")
            continue

    # ── Tier 5: Mistral SDK (official client, free tier) ──
    if MISTRAL_API_KEY:
        mistral_models = ["mistral-small-latest", "open-mistral-7b", "open-mixtral-8x7b"]
        mistral_client = MistralClient(api_key=MISTRAL_API_KEY)
        for mm in mistral_models:
            try:
                print(f"[AI Tier-5] Mistral SDK → {mm}")
                res = await asyncio.to_thread(
                    mistral_client.chat.complete,
                    model=mm,
                    messages=messages,
                )
                if res and res.choices:
                    content = res.choices[0].message.content
                    print(f"[AI ✓] Mistral {mm} success.")
                    return {"choices": [{"message": {"content": content}}]}
            except Exception as e:
                print(f"[AI Tier-5] {mm} error: {e}")
                continue

    # ── Tier 6: Groq 8B last resort ──
    try:
        print("[AI Tier-6] Groq llama-3.1-8b-instant (last resort)")
        response = await http_client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={"model": "llama-3.1-8b-instant", "messages": messages, "temperature": temperature},
            timeout=timeout + 10,
        )
        if response.status_code < 400:
            return response.json()
    except Exception as e:
        print(f"[AI Tier-6] Final fallback failed: {e}")

    raise HTTPException(status_code=503, detail="All AI models are currently unavailable. Please try again shortly.")

# Legacy alias kept for backwards compatibility
async def _call_ai_legacy(messages, temperature=0.1, timeout=30.0):
    return await call_ai_agent(messages, temperature, timeout)

# For backwards compatibility with direct db access in some parts
db = db_ops.db

app = FastAPI(title="Elderly Guardian AI API")

# Mount uploads for static access
from fastapi.staticfiles import StaticFiles
import db_sync # Import our new sync utility
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Add CORS middleware for frontend communication
# Note: allow_origins=['*'] is incompatible with allow_credentials=True in modern browsers.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*\.vercel\.app|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- AI-generated app info (cached per day) ----------
import time as _time_mod
_app_info_cache: dict = {"date": "", "tip": "", "feature": ""}

@app.get("/api/app-info")
async def get_app_info_endpoint():
    """Returns live AI-generated daily health tip + feature spotlight."""
    today = datetime.now().strftime("%Y-%m-%d")
    if _app_info_cache["date"] == today and _app_info_cache["tip"]:
        return _app_info_cache

    prompt = (
        f"Today is {today}. You are the Elderly Guardian AI health assistant. "
        "Generate a short, warm, actionable daily health tip for elderly care (≤ 2 sentences). "
        "Also suggest one modern AI healthcare feature relevant to 2025 (e.g. fall detection, wearable integration, "
        "mental wellness check-in, diet AI, voice health journaling) in ≤ 10 words. "
        "Respond in JSON only: {\"tip\": \"...\", \"feature\": \"...\"}"
    )
    tip = ""
    feature = ""
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content.strip()
        # extract JSON tolerantly
        import json as _json, re as _re
        m = _re.search(r"\{.*\}", raw, _re.DOTALL)
        if m:
            parsed = _json.loads(m.group())
            tip = parsed.get("tip", "")
            feature = parsed.get("feature", "")
    except Exception as ai_err:
        print(f"[AppInfo] AI tip failed: {ai_err}")

    if not tip:
        tips = [
            "Drink a glass of water every hour — hydration reduces fatigue and improves cognitive clarity.",
            "A 10-minute morning walk boosts heart health and sets a positive rhythm for the day.",
            "Keep a simple mood journal; noting feelings daily helps spot early signs of depression.",
            "Take your medicines with food at the same time each day to build a reliable habit.",
            "Deep breathing for 5 minutes before bed lowers blood pressure and improves sleep quality.",
        ]
        features = [
            "AI fall detection via smartphone camera",
            "Wearable-linked real-time heart-rate alerts",
            "Daily mental wellness check-in voice journaling",
            "Smart diet AI with personalised meal planning",
            "Medication adherence streak & gamification",
        ]
        idx = int(_time_mod.time() // 86400) % len(tips)
        tip = tips[idx]
        feature = features[idx]

    _app_info_cache.update({"date": today, "tip": tip, "feature": feature})
    return _app_info_cache

# Data Models
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = ""

class UserLogin(BaseModel):
    name_or_email: str
    password: str

class Medicine(BaseModel):
    id: Optional[int] = None
    name: str
    dosage: str
    time: str
    after_meal: bool
    end_date: Optional[str] = None
    taken: bool = False
    user_id: Optional[int] = None

class Vitals(BaseModel):
    user_id: int
    bp_systolic: int
    bp_diastolic: int
    sugar_level: int
    heart_rate: int
    notes: Optional[str] = ""

class Appointment(BaseModel):
    user_id: int
    doctor_name: str
    date: str
    time: str
    reason: str

class LocationUpdate(BaseModel):
    user_id: int
    latitude: float
    longitude: float

class VoiceCommand(BaseModel):
    text: str
    user_id: int
    language: str = "en"
    gender: Optional[str] = "Female"

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Elderly Guardian AI Core",
        "message": "AI Agents stand ready.",
        "version": "2.0.0",
        "features": ["OCR", "Voice Recognition", "Facial Analysis", "Vitals Monitoring", "AI Assistant"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# --- Medicine History Endpoints ---
@app.get("/medicines/history")
async def get_med_history(user_id: int, days: int = 60):
    return {"success": True, "history": db_ops.get_history(user_id, days)}

@app.delete("/medicines/history/{history_id}")
async def delete_med_history(history_id: int):
    success = db_ops.delete_history_item(history_id)
    return {"success": success}

# Authentication
@app.post("/api/signup")
async def signup(user: UserRegister):
    new_user = db_ops.create_user(user.name, user.email, user.password, user.phone)
    if new_user:
        if 'password' in new_user: del new_user['password']
        return {"success": True, "user": new_user}
    raise HTTPException(status_code=400, detail="User already exists")

@app.post("/api/login")
async def login(user: UserLogin):
    if not user.name_or_email.strip() or not user.password.strip():
        raise HTTPException(status_code=400, detail="Email and password are required")
    auth_user = db_ops.authenticate_user(user.name_or_email, user.password)
    if auth_user:
        if 'password' in auth_user: del auth_user['password']
        return {"success": True, "user": auth_user}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/guest-login")
async def guest_login():
    """Endpoint for creating a temporary guest login session"""
    try:
        new_guest = db_ops.create_guest_user()
        if new_guest:
            if 'password' in new_guest: del new_guest['password']
            return {"success": True, "user": new_guest}
        raise HTTPException(status_code=500, detail="Failed to create guest session")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Email Validation ---
DISPOSABLE_DOMAINS = {
    "tempmail.com","throwaway.email","guerrillamail.com","mailinator.com","yopmail.com",
    "10minutemail.com","trashmail.com","fakeinbox.com","sharklasers.com","guerrillamailblock.com",
    "grr.la","dispostable.com","maildrop.cc","temp-mail.org","tempail.com","mohmal.com",
    "getnada.com","emailondeck.com","mintemail.com","discard.email","burnermail.io",
    "tempr.email","mailnesia.com","spamgourmet.com","mytemp.email","tmpmail.org","tmpmail.net",
    "harakirimail.com","tmail.ws","emailfake.com","crazymailing.com","mailsac.com",
    "inboxbear.com","mailcatch.com","trashmail.net","wegwerfmail.de","spamfree24.org"
}

class EmailValidation(BaseModel):
    email: str

@app.post("/api/validate-email")
async def validate_email(data: EmailValidation):
    import re as re_mod
    email = data.email.strip().lower()
    # Basic format check
    if not re_mod.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return {"valid": False, "reason": "Invalid email format"}
    domain = email.split('@')[1]
    # Disposable domain check
    if domain in DISPOSABLE_DOMAINS:
        return {"valid": False, "reason": "Disposable/temporary email addresses are not allowed"}
    # Check if email already exists
    _sb = getattr(db_ops, 'supabase', None)
    if _sb:
        try:
            existing = _sb.table("users").select("id").eq("email", email).execute()
            if existing.data:
                return {"valid": False, "reason": "Email already registered"}
        except: pass
    # DNS MX record check
    try:
        import subprocess
        result = subprocess.run(["nslookup", "-type=mx", domain], capture_output=True, text=True, timeout=5)
        if "mail exchanger" not in result.stdout.lower() and "mx preference" not in result.stdout.lower():
            return {"valid": False, "reason": "Email domain does not accept emails"}
    except:
        pass  # If DNS check fails, allow it (could be network issue)
    return {"valid": True, "reason": "Email looks valid"}

# --- Username Management ---
class UsernameUpdate(BaseModel):
    username: str

@app.get("/api/check-username/{username}")
async def check_username(username: str):
    _sb = getattr(db_ops, 'supabase', None)
    if not _sb:
        return {"available": False, "reason": "Database unavailable"}
    if len(username) < 3:
        return {"available": False, "reason": "Username must be at least 3 characters"}
    if len(username) > 20:
        return {"available": False, "reason": "Username must be 20 characters or fewer"}
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return {"available": False, "reason": "Only letters, numbers, and underscores allowed"}
    try:
        existing = _sb.table("users").select("id").eq("name", username).execute()
        if existing.data:
            return {"available": False, "reason": "Username already taken"}
        return {"available": True, "reason": "Username is available"}
    except Exception as e:
        return {"available": False, "reason": str(e)}

@app.put("/api/users/{user_id}/username")
async def update_username(user_id: int, data: UsernameUpdate):
    _sb = getattr(db_ops, 'supabase', None)
    if not _sb:
        raise HTTPException(status_code=500, detail="Database unavailable")
    username = data.username.strip()
    if len(username) < 3 or not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise HTTPException(status_code=400, detail="Invalid username format")
    try:
        existing = _sb.table("users").select("id").eq("name", username).execute()
        if existing.data and existing.data[0]["id"] != user_id:
            raise HTTPException(status_code=409, detail="Username already taken")
        _sb.table("users").update({"name": username}).eq("id", user_id).execute()
        return {"success": True, "username": username}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PasswordUpdate(BaseModel):
    password: str

@app.put("/api/users/{user_id}/password")
async def update_password(user_id: int, data: PasswordUpdate):
    if not db_ops.update_user_password(user_id, data.password):
        raise HTTPException(status_code=500, detail="Failed to update password")
    return {"success": True}

# --- OAuth Login (simulated provider data) ---
class OAuthLogin(BaseModel):
    provider: str
    provider_email: str
    provider_name: str
    provider_avatar: Optional[str] = None

@app.post("/api/oauth-login")
async def oauth_login(data: OAuthLogin):
    """Create or login a user from OAuth provider data"""
    _sb = getattr(db_ops, 'supabase', None)
    if not _sb:
        raise HTTPException(status_code=500, detail="Database unavailable")
    try:
        # Check if user exists by email
        existing = _sb.table("users").select("*").eq("email", data.provider_email).execute()
        if existing.data:
            user = existing.data[0]
            if 'password' in user: del user['password']
            return {"success": True, "user": user, "is_new": False}
        # Create new user with OAuth data
        import secrets
        temp_password = secrets.token_hex(16)  # Random password for OAuth users
        new_user = db_ops.create_user(
            name=data.provider_name,
            email=data.provider_email,
            password=temp_password,
            phone=""
        )
        if new_user:
            if 'password' in new_user: del new_user['password']
            # Update avatar if provided
            if data.provider_avatar:
                _sb.table("users").update({"avatar_url": data.provider_avatar}).eq("id", new_user["id"]).execute()
                new_user["avatar_url"] = data.provider_avatar
            return {"success": True, "user": new_user, "is_new": True}
        raise HTTPException(status_code=400, detail="Failed to create OAuth user")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Settings
class UserSettings(BaseModel):
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_language: Optional[str] = None
    voice_enabled: Optional[bool] = None
    ai_enabled: Optional[bool] = None
    voice_reminders_enabled: Optional[bool] = None
    ai_language: Optional[str] = None
    ai_always_active: Optional[bool] = None
    ai_voice_gender: Optional[str] = None
    ai_voice_rate: Optional[float] = None
    booking_language: Optional[str] = None
    booking_voice_gender: Optional[str] = None
    theme: Optional[str] = None
    font_size_scale: Optional[float] = None

@app.put("/api/settings/{user_id}")
async def update_settings(user_id: int, settings: UserSettings):
    # Use model_dump(exclude_unset=True) to ensure we only update fields actually sent by the client
    # This preserves current values for other fields (like language) during partial updates
    # We use a truthy check but allow for the possibility that no fields match the schema
    update_data = settings.model_dump(exclude_unset=True)
    if not update_data:
        return {"success": True, "message": "No changes requested"}
        
    result = db_ops.update_user_settings(user_id, update_data)
    if result is not None:
        return {"success": True}
    
    # If it failed but it was a partial update that might have been filtered out entirely
    # db_ops.update_user_settings returns None only on actual database error
    raise HTTPException(status_code=400, detail="Failed to update settings")

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    """Get user data including all settings"""
    user = db_ops.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Remove sensitive data
    if 'password' in user:
        del user['password']
    return user


# Medication endpoints
@app.get("/medicines")
async def get_medicines_endpoint(user_id: int):
    return {"medicines": db_ops.get_medicines(user_id)}

@app.post("/medicines")
async def add_medicine_endpoint(medicine: Medicine):
    if not medicine.user_id: raise HTTPException(status_code=400, detail="user_id required")
    new_med = db_ops.add_medicine(medicine.user_id, medicine.name, medicine.dosage, medicine.time, medicine.after_meal, end_date=medicine.end_date)
    return {"success": True, "medicine": new_med}

@app.put("/medicines/{medicine_id}")
async def update_medicine_endpoint(medicine_id: int, medicine: Medicine):
    if db_ops.update_medicine_details(medicine_id, medicine.name, medicine.dosage, medicine.time, medicine.after_meal):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Not found")

@app.delete("/medicines/{medicine_id}")
async def delete_medicine_endpoint(medicine_id: int):
    if db_ops.delete_medicine(medicine_id): return {"success": True}
    raise HTTPException(status_code=404, detail="Not found")

@app.post("/medicines/{medicine_id}/taken")
async def mark_taken_endpoint(medicine_id: int):
    # This calls the fixed function in database_simple.py
    if db_ops.update_medicine(medicine_id, True): return {"success": True}
    raise HTTPException(status_code=404, detail="Not found")

@app.post("/medicines/{medicine_id}/missed")
@app.get("/medicines/{medicine_id}/missed")
async def mark_missed_endpoint(medicine_id: int):
    if db_ops.mark_medicine_missed(medicine_id): return {"success": True}
    raise HTTPException(status_code=404, detail="Not found")

@app.get("/medicines/history")
async def get_medicine_history(user_id: int, days: int = 60):
    return {"success": True, "history": db.get_history(user_id, days)}

@app.delete("/medicines/history/{history_id}")
async def delete_history_item(history_id: int):
    db.delete_history_item(history_id)
    return {"success": True}

# OCR Prescription
@app.post("/ocr/prescription")
async def ocr_prescription(file: UploadFile = File(...)):
    # Validating content type if provided, otherwise letting Pillow handle it
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    try:
        contents = await file.read()
        
        # --- Robust Image Preprocessing ---
        try:
            img = Image.open(io.BytesIO(contents))
            img = img.convert("RGB") # Handle RGBA/P and convert to standard RGB
            
            # Resize if too large (Groq/LLaVA limit usually ~2048 or lower for speed/memory)
            max_size = 2048
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size))
                
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
            mime_type = "image/jpeg"
        except Exception as img_err:
            print(f"[OCR IMAGE ERROR] Failed to process image: {img_err}")
            raise HTTPException(status_code=400, detail=f"Corrupted or unsupported image file: {str(img_err)}")

        prompt = """
        Analyze this prescription image. Extract only clearly visible medications.
        For each, identify: Name, Dosage, Timing.
        
        CRITICAL RULES:
        1. Output as a STRICT JSON object: {"medications": [{"name": "...", "dosage": "...", "timing": "..."}]}
        2. If the text is illegible or no medications are present, return {"medications": []}.
        3. DO NOT GUESS or hallucinate. Do not output 'Amoxicillin' or 'Ibuprofen' unless clearly written in the image.
        4. Do not include Example/Placeholder data.
        """
        async with httpx.AsyncClient() as client:
            print(f"[OCR] Sending to Groq Vision API...")
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                    "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}}]}],
                    "response_format": {"type": "json_object"}
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                print(f"[OCR ERROR] API Status {response.status_code}: {response.text}")
                # Log detailed error to trace file
                with open("ocr_trace.json", "w") as f:
                     json.dump({"error": response.text, "status": response.status_code}, f)
                raise HTTPException(status_code=500, detail=f"AI Service Error ({response.status_code})")

            result = response.json()
            # Write to NEW trace file to verify code update
            with open("ocr_trace.json", "w") as f:
                json.dump(result, f, indent=2)
            print(f"[OCR] Groq Response saved to ocr_trace.json")
            
            if 'choices' not in result:
                error_msg = result.get('error', {}).get('message', 'Unknown Groq Error')
                print(f"[OCR ERROR] Groq API returned no choices: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Groq API Error: {error_msg}")
                
            content = result['choices'][0]['message']['content']
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                print(f"[OCR WARNING] Model returned non-JSON: {content}")
                # Fallback: return empty list instead of crashing
                data = {"medications": [], "raw_text": content}
                
            data["success"] = True
            print(f"[OCR SUCCESS] Extracted: {len(data.get('medications', []))} medications")
            return data
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[OCR EXCEPTION] {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")

# Facial Health Analysis
@app.post("/analyze/face")
async def analyze_face(file: UploadFile = File(...)):
    """
    Privacy-First Facial Analysis:
    1. Processes image in-memory (no disk storage).
    2. Uses Llama 4 Scout Vision (via Groq) for rapid analysis.
    3. Returns health indicators and estimated vitals.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        contents = await file.read()
        
        # --- Robust Image Preprocessing (Face) ---
        try:
            img = Image.open(io.BytesIO(contents))
            img = img.convert("RGB")
            
            # Resize if too large
            max_size = 2048
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size))
                
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
            mime_type = "image/jpeg"
        except Exception as img_err:
            print(f"[FACE IMAGE ERROR] Failed to process image: {img_err}")
            raise HTTPException(status_code=400, detail=f"Corrupted or unsupported image file: {str(img_err)}")
        
        # Privacy & Analysis Prompt
        prompt = """
        Analyze this facial image for GENERAL HEALTH INDICATORS and VITAL SIGNS estimation.
        
        PRIVACY NOTICE: Do not identify the person. Focus only on physiological signs.
        
        TASKS:
        1. Detect signs of Fatigue (Dark circles, eye droop).
        2. Detect signs of Jaundice (Yellowish skin/eyes).
        3. Detect signs of Stress (Micro-expressions, tension).
        4. Detect signs of Dehydration (Dry lips, sunken eyes).
        5. Detect signs of Anemia (Pale skin/lips).
        6. ESTIMATE Vitals based on rPPG-like visual features (skin flush, tension):
           - Heart Rate (bpm)
           - Blood Pressure (systolic/diastolic)
           - Oxygen Saturation (%)
        
        OUTPUT FORMAT (Strict JSON):
        {
            "status": "Healthy" | "Attention Needed" | "Warning",
            "accuracy": 0.85,
            "detections": {
                "fatigue": { "level": "None"|"Low"|"Moderate"|"High", "confidence": 0.0-1.0 },
                "jaundice": { "detected": boolean, "confidence": 0.0-1.0 },
                "stress": { "level": "Low"|"Moderate"|"High", "confidence": 0.0-1.0 },
                "dehydration": { "detected": boolean, "confidence": 0.0-1.0 },
                "anemia": { "detected": boolean, "confidence": 0.0-1.0 }
            },
            "vitals_estimated": {
                "heart_rate": int,
                "blood_pressure": "120/80",
                "oxygen_saturation": int
            },
            "summary": "Brief 1-sentence health summary.",
            "recommendations": ["Tip 1", "Tip 2", "Tip 3"]
        }
        """
        
        async with httpx.AsyncClient() as client:
            print(f"[FACE] Sending to Groq Vision API (Llama 4 Scout)...")
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "meta-llama/llama-4-scout-17b-16e-instruct", 
                    "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}}]}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                print(f"[FACE ERROR] API Error: {response.text}")
                raise HTTPException(status_code=500, detail="AI Analysis Service Unavailable")
                
            result = response.json()
            if 'choices' not in result:
                 raise ValueError("No analysis generated")
                 
            content = result['choices'][0]['message']['content']
            
            # JSON Cleanup
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "")
            
            data = json.loads(content)
            print(f"[FACE SUCCESS] Analysis complete")
            return data

    except Exception as e:
        print(f"[FACE EXCEPTION] {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Facial Analysis Failed")

# AI Voice Booking - Enhanced Stage-Aware Parser

@app.post("/voice/parse")
async def voice_parse_booking(request: Request):
    """Enhanced voice parsing for appointment booking with stage awareness and smart date/time parsing"""
    try:
        body = await request.json()
        text = body.get("text", "")
        language = body.get("language", "en")
        stage = body.get("stage", "doctor")
        gender = body.get("gender", "Female")
        current_data = body.get("current_data", {})
        
        # Get current date context
        now = datetime.now()
        current_date_str = now.strftime("%Y-%m-%d")
        current_day = now.strftime("%A")
        
        # Use full language name for better AI comprehension
        full_lang = LANG_NAME_MAP.get(language, "English")
        
        # Build context-aware prompt
        system_prompt = f"""
You are a focused medical booking assistant. YOUR ONLY GOAL is to fill the JSON schema based on the user's input.
Current stage: {stage}.
Current Data:
- Doctor: {current_data.get('doctor', 'null')}
- Date: {current_data.get('date', 'null')}
- Time: {current_data.get('time', 'null')}
- Reason: {current_data.get('reason', 'null')}

Today is: {current_date_str} ({current_day}).

EXTRACTION RULES:
1. ENTITY EXTRACTION: Extract ANY and ALL entities mentioned (Doctor name, Date, Time, Reason) regardless of the current stage. 
2. REASON EXTRACTION: If {stage} is 'reason' or the user mentions symptoms/reason, save it.
3. DATE PARSING: Use YYYY-MM-DD. If user says "tomorrow", "next Monday", parse relative to {current_date_str}.
4. TIME PARSING: Use HH:MM (24h format).
5. EDIT/CHANGE: If the user indicates they want to change a specific field (e.g., "change doctor", "wrong time"), set that field to "null" and set 'next_stage' to that field.

STAGE & RESPONSE RULES:
1. SEQUENCE: doctor -> date -> time -> reason -> confirm.
2. DETERMINING NEXT STAGE:
   - Identify the FIRST missing piece of information in the sequence and set 'next_stage' to that.
   - If all fields (doctor, date, time, reason) are filled, 'next_stage' MUST be 'confirm'.
   - If 'next_stage' is 'confirm' and user says "yes/ok/book/confirm" or native equivalents, set 'next_stage' to 'complete' and 'is_complete' to true.
   - If user asks to "edit" or "change" something in the 'confirm' stage, set 'next_stage' to the relevant field and set that field to "null".
3. ACKNOWLEDGEMENT: Briefly acknowledge new info ("Got it", "Okay").
4. CONFIRMATION RESPONSE: If 'next_stage' is 'confirm', summarize everything: "Summary: Dr. {{doctor}} on {{date}} at {{time}} for {{reason}}." Ask for confirmation in {full_lang}.
5. is_complete LOGIC: Set 'is_complete': true ONLY when the user explicitly confirms the full summary.

MULTILINGUAL (CRITICAL):
- You MUST respond in {full_lang} script ONLY. 
- DO NOT use English letters in 'response_text' (except for numbers/time).
- Use polite honorifics based on {full_lang} culture (e.g., "-ji", "-andi", "Amma", "Appa").
- Recognize confirmation (e.g., हाँ, అవును, சரி, ਹਾਂ) and edit/change (e.g., बदलें, మార్చు, மாற்று, बदला) in {full_lang}.

Output ONLY valid JSON:
{{
    "doctor": "string or null",
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM or null",
    "reason": "string or null",
    "next_stage": "doctor | date | time | reason | confirm | complete",
    "response_text": "polite response in {full_lang} script",
    "is_complete": boolean
}}
"""
        messages = [
            {"role": "system", "content": system_prompt + "\nIMPORTANT: You MUST output ONLY valid JSON. START WITH { AND END WITH }."},
            {"role": "user", "content": text}
        ]
        
        data = await call_ai_agent(messages, temperature=0.1)
        
        if 'choices' not in data:
            print(f"[VOICE P ERROR] Groq API response missing choices: {data}")
            raise ValueError(f"Groq API Error: {data.get('error', {}).get('message', 'Unknown Error')}")
            
        raw_content = data['choices'][0]['message']['content'].strip()
        print(f"[VOICE P DEBUG] Raw Content: {raw_content}")
        
        # Robust JSON extraction
        try:
            # Try direct parsing first
            content = json.loads(raw_content)
        except json.JSONDecodeError:
            # Extract JSON from common patterns (find first { and last })
            start = raw_content.find('{')
            end = raw_content.rfind('}')
            if start != -1 and end != -1:
                try:
                    extracted = raw_content[start:end+1]
                    # Final safety: if it's missing a closing quote for a property, try to fix common 8B cuts
                    if extracted.count('"') % 2 != 0:
                        extracted += '"'
                    if not extracted.endswith('}'):
                        extracted += '}'
                    content = json.loads(extracted)
                except Exception as e2:
                    print(f"[VOICE P DEBUG] Extraction failed: {e2}")
                    # Last ditch: strip markdown properly
                    cleaned = raw_content.replace("```json", "").replace("```", "").replace("JSON", "").strip()
                    if not cleaned.startswith("{"): cleaned = "{" + cleaned.split("{", 1)[-1]
                    if not cleaned.endswith("}"): cleaned = cleaned.rsplit("}", 1)[0] + "}"
                    content = json.loads(cleaned)
            else:
                cleaned = raw_content.replace("```json", "").replace("```", "").strip()
                content = json.loads(cleaned)
        
        return content
    except Exception as e:
        print(f"Voice Parse Error: {e}")
        traceback.print_exc()
        # Log error to file for persistent debugging
        with open("voice_error.log", "a", encoding="utf-8") as f:
            f.write(f"{datetime.now()}: {str(e)}\n{traceback.format_exc()}\n")
        
        return {
            "doctor": None, "date": None, "time": None, "reason": None,
            "response_text": "I'm sorry, I'm having trouble processing your request right now.",
            "is_complete": False
        }

@app.post("/ai/chat")
async def ai_chat(command: VoiceCommand):
    """Main AI Assistant with Intent Recognition and Action Execution"""
    try:
        # Fetch Enhanced Context in Parallel for Speed
        import asyncio
        all_meds, latest_vitals, appointments = [], {}, []
        
        # Retry logic for Windows socket issues (WinError 10035)
        for attempt in range(2):
            try:
                meds_task = asyncio.to_thread(db_ops.get_medicines, command.user_id)
                vitals_task = asyncio.to_thread(db_ops.get_latest_vitals, command.user_id)
                app_task = asyncio.to_thread(db_ops.get_appointments, command.user_id)
                
                all_meds, latest_vitals, appointments = await asyncio.gather(meds_task, vitals_task, app_task)
                break # Success
            except Exception as e:
                print(f"[Supabase WARN] Context fetch attempt {attempt+1} failed: {e}")
                if attempt == 0: await asyncio.sleep(0.5)
                else: print("[Supabase ERROR] Persistent failure in context fetching.")

        # Format Context
        med_context = ", ".join([f"{m['name']} ({m['time']})" for m in all_meds if not m['taken']]) or "None pending"
        
        vitals_ctx = "No recent records"
        if latest_vitals:
            try:
                # Use .get() and nested .get() for maximum robustness
                bp = latest_vitals.get("bp", {})
                sugar = latest_vitals.get("sugar", {})
                hr = latest_vitals.get("heart_rate", {})
                
                systolic = bp.get("systolic", "N/A")
                diastolic = bp.get("diastolic", "N/A")
                sugar_level = sugar.get("level", "N/A")
                hr_bpm = hr.get("bpm", "N/A")
                last_checked = latest_vitals.get("last_checked", "N/A")
                
                vitals_ctx = f"BP {systolic}/{diastolic}, Sugar {sugar_level}, HR {hr_bpm} ({last_checked})"
            except Exception as ve:
                print(f"[AI WARN] Error formatting vitals context: {ve}")
                vitals_ctx = "Data available but failed to format"
            
        app_ctx = "None upcoming"
        if appointments:
            app_ctx = ", ".join([f"Dr. {a.get('doctor_name', 'Unknown')} ({a['date']} {a['time']})" for a in appointments])
        
        # Get current date context
        now = datetime.now()
        current_date_str = now.strftime("%Y-%m-%d")
        current_day = now.strftime("%A")
        # Use full language name
        full_lang = LANG_NAME_MAP.get(command.language, "English")

        system_prompt = f"""
        You are 'Guardian', a world-class, empathetic, and highly intelligent AI companion designed for the elderly.
        Current Date: {current_date_str} ({current_day}).
        
        USER HEALTH CONTEXT:
        - Medications (Pending): {med_context}
        - Recent Vitals: {vitals_ctx}
        - Appointments: {app_ctx}
        
        PERSONA & MULTILINGUAL EXPERTISE:
        - Warm, natural, and conversational. NEVER robotic. 
        - VIBE: Knowledgeable friend or caring family member.
        - FLUENCY: Native speaker of {full_lang}. Use appropriate nuances, honorifics, and idioms. 
        - SCRIPT: Always respond in {full_lang} script (e.g., Devanagari for Hindi, Telugu script for Telugu).
        
        CAPABILITIES (STRUCTURED INTENTS):
        1. 'navigate': Redirect user. Targets: "home", "meds", "docs", "stats", "face", "predict", "admin", "chat".
        2. 'change_setting': Adjust user preferences. Keys: "theme" (light/dark), "font_size" (normal/large), "language" (en/hi/te/ta/etc).
        3. 'toggle_feature': Enable/disable tools. Features: "voice", "reminders", "ai_always_active".
        4. 'ui_action': Command the UI. Actions: "open_settings", "close_settings", "open_vitals", "open_meds".
        5. 'log_vitals': Record health data.
        
        ROBUSTNESS EXAMPLES:
        - "Switch to dark mode" -> intent: "change_setting", key: "theme", value: "dark"
        - "दवाइयां दिखाओ" (Show medicines) -> intent: "navigate", target: "meds"
        - "నా రక్తపోటు 120/80" (My BP is 120/80) -> intent: "log_vitals", bp_systolic: 120, bp_diastolic: 80
        - "Change language to Telugu" -> intent: "change_setting", key: "language", value: "te"
        - "Make the text bigger" -> intent: "change_setting", key: "font_size", value: "large"
        
        STRICT PROTOCOL:
        1. 'response_text' MUST be in {full_lang} script.
        2. 'intent' and 'parameters' MUST be in English.
        3. Output ONLY valid JSON.
        
        JSON Format:
        {{
            "response_text": "Engaging response in {full_lang}",
            "intent": "navigate|change_setting|toggle_feature|ui_action|log_vitals|chat",
            "parameters": {{ "target": "destination_id", "key": "setting_key", "value": "new_value" }}
        }}
        """
        
        messages = [
            {"role": "system", "content": system_prompt + "\nIMPORTANT: You MUST output ONLY valid JSON. START WITH { AND END WITH }."},
            {"role": "user", "content": command.text}
        ]
        
        data = await call_ai_agent(messages, temperature=0.2, timeout=15.0)
        
        if 'choices' not in data:
            print(f"[CHAT ERROR] Groq API response missing choices: {data}")
            raise ValueError(f"Groq API Error: {data.get('error', {}).get('message', 'Unknown Error')}")
            
        raw_content = data['choices'][0]['message']['content'].strip()
        print(f"[CHAT DEBUG] Raw Content: {raw_content}")
        
        # Robust JSON extraction
        try:
            # First attempt: standard loads
            content = json.loads(raw_content)
        except json.JSONDecodeError:
            try:
                # 1. Clean common AI output issues
                processed = raw_content.replace('“', '"').replace('”', '"').replace("‘", "'").replace("’", "'")
                
                # 2. Extract from markdown if present
                if "```json" in processed:
                    processed = processed.split("```json")[1].split("```")[0].strip()
                elif "```" in processed:
                    processed = processed.split("```")[1].split("```")[0].strip()
                
                # 3. Aggressive JSON Recovery
                # Look for the true start of the JSON object or key-value content
                first_key = processed.find('"response_text"')
                first_brace = processed.find('{')
                
                # If "response_text" exists but there's either no brace, or the key comes BEFORE the brace
                # we have garbage at the start or a missing brace
                if first_key != -1 and (first_brace == -1 or first_key < first_brace):
                    processed = processed[first_key:] # Strip everything before the first valid key
                    if not processed.startswith("{"):
                        processed = "{" + processed
                
                # Ensure it ends with a brace
                last_brace = processed.rfind('}')
                if last_brace != -1:
                    processed = processed[:last_brace+1]
                elif not processed.endswith("}"):
                    processed += "}"

                # Final cleaning
                processed = processed.replace("\n", " ").strip()
                if processed.endswith(","): processed = processed[:-1] # Remove trailing commas
                if not processed.endswith("}"): processed += "}"
                
                try:
                    content = json.loads(processed)
                except json.JSONDecodeError as je:
                    print(f"[AI RECOVERY] Step 2 failed: { je }. Content: {processed[:100]}...")
                    # Regex-based extraction as a last attempt to rebuild the object
                    resp_match = re.search(r'"response_text":\s*"([^"]+)"', raw_content)
                    intent_match = re.search(r'"intent":\s*"([^"]+)"', raw_content)
                    resp_text = resp_match.group(1) if resp_match else "I'm having trouble processing that."
                    intent = intent_match.group(1) if intent_match else "chat"
                    content = {"response_text": resp_text, "intent": intent, "parameters": {}}
                    
            except Exception as e2:
                print(f"[AI FATAL] JSON Extraction completely failed: {e2}")
                content = {"response_text": "I'm sorry, I encountered a processing error.", "intent": "chat", "parameters": {}}
        
        # Handle Backend Actions
        if content.get("intent") == "log_vitals":
            params = content.get("parameters", {})
            db_ops.save_vitals(
                command.user_id,
                params.get("bp_systolic"),
                params.get("bp_diastolic"),
                params.get("sugar_level"),
                params.get("heart_rate"),
                params.get("notes", "Logged via voice assistant")
            )
            print(f"[AI ACTION] Logged vitals for user {command.user_id}")

        return content
    except Exception as e:
        import httpx
        err_msg = str(e)
        if "getaddrinfo failed" in err_msg or isinstance(e, httpx.ConnectError):
            print(f"[AI ERROR] Network connectivity issue: {e}")
            return {
                "response_text": "I seem to be offline. Please check your internet connection.",
                "intent": "chat",
                "parameters": {}
            }
        
        print(f"AI Chat Error: {e}")
        traceback.print_exc()
        return {"response_text": "I'm sorry, I'm having trouble right now.", "intent": "chat", "parameters": {}}

# Vitals
@app.get("/api/vitals")
async def get_vitals(user_id: int = 1):
    vitals = db_ops.get_latest_vitals(user_id)
    if not vitals: return {"bp": {"systolic": 0, "diastolic": 0, "last_checked": "Never"}, "sugar": {"level": 0, "last_checked": "Never"}, "heart_rate": {"bpm": 0, "last_checked": "Never"}}
    return vitals

@app.post("/api/vitals")
async def post_vitals(vitals: Vitals):
    db_ops.save_vitals(vitals.user_id, vitals.bp_systolic, vitals.bp_diastolic, vitals.sugar_level, vitals.heart_rate, vitals.notes)
    return {"success": True}

@app.get("/api/vitals/history")
async def get_vitals_history_endpoint(user_id: int, limit: int = 100):
    return {"history": db_ops.get_vitals_history(user_id, limit)}

@app.delete("/api/vitals/{vitals_id}")
async def delete_vitals_endpoint(vitals_id: int):
    success = db_ops.delete_vitals(vitals_id)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to delete vitals")

@app.put("/api/vitals/{vitals_id}")
async def update_vitals_endpoint(vitals_id: int, vitals: Vitals):
    success = db_ops.update_vitals(vitals_id, vitals.bp_systolic, vitals.bp_diastolic, vitals.sugar_level, vitals.heart_rate, vitals.notes)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to update vitals")

@app.put("/api/users/{user_id}/settings")
async def update_user_settings_endpoint(user_id: int, settings: dict):
    """Update user preferences and settings"""
    try:
        print(f"[API] Updating settings for user {user_id}: {settings.keys()}")
        updated_user = db_ops.update_user_settings(user_id, settings)
        if updated_user:
            return {"success": True, "user": updated_user}
        # If it returned info dict
        if isinstance(updated_user, dict) and "info" in updated_user:
             return {"success": False, "message": "No valid fields to update"}
            
        raise HTTPException(status_code=500, detail="Database update failed")
    except Exception as e:
        print(f"[API ERROR] Update settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/health/analyze")
async def analyze_health(vitals: dict):
    """AI Vitals Analysis with Regional Language Support"""
    try:
        lang = vitals.get('language', 'en')
        # Extract meaningful values safely
        systolic = vitals.get('bp', {}).get('systolic') or vitals.get('bp_systolic') or 0
        diastolic = vitals.get('bp', {}).get('diastolic') or vitals.get('bp_diastolic') or 0
        sugar = vitals.get('sugar', {}).get('level') or vitals.get('sugar_level') or 0
        hr = vitals.get('heart_rate', {}).get('bpm') or vitals.get('heart_rate') or 0
        
        # Facial Analysis Context
        face_data = vitals.get('facial_scan')
        face_context = ""
        if face_data:
            try:
                face_context = f"""
                FACIAL ANALYSIS FINDINGS:
                - Estimated Vitals: {face_data.get('vitals_estimated', {})}
                - Fatigue Level: {face_data.get('detections', {}).get('fatigue', {}).get('level', 'Unknown')}
                - Stress Level: {face_data.get('detections', {}).get('stress', {}).get('level', 'Unknown')}
                - Dehydration Detected: {face_data.get('detections', {}).get('dehydration', {}).get('detected', False)}
                - Jaundice Detected: {face_data.get('detections', {}).get('jaundice', {}).get('detected', False)}
                
                Please INTEGRATE these facial findings into the health summary. If facial vitals differ significantly from recorded vitals, note the discrepancy.
                """
            except Exception as e:
                print(f"[HEALTH ANALYZE] Error parsing face data: {e}")

        prompt = f"""
        Analyze these vitals for an elderly patient:
        Blood Pressure: {systolic}/{diastolic} mmHg
        Blood Sugar: {sugar} mg/dL
        Heart Rate: {hr} bpm
        {face_context}
        
        LANGUAGE: Respond in {lang}. Use the correct regional script (e.g. Telugu script for 'te', Devanagari for 'hi').
        
        Output a JSON object with:
        1. "analysis": A 1-sentence comforting summary of their status in {lang}. If facial analysis shows fatigue or stress, mention it gently.
        2. "recommendations": A list of 3 simple, actionable health tips in {lang}.
        
        Example: {{"analysis": "Your blood pressure is slightly high and you look a bit tired.", "recommendations": ["Reduce salt intake", "Rest for 15 minutes", "Stay hydrated"]}}
        """
        
        messages = [
            {"role": "system", "content": "You are a compassionate medical AI assistant. Output ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        data = await call_ai_agent(messages, temperature=0.1, timeout=10.0)
        
        if 'choices' not in data:
            print(f"[HEALTH ANALYZE ERROR] Missing 'choices' in Groq response: {data}")
            raise ValueError(f"Groq API Error: {data.get('error', {}).get('message', 'Unknown error')}")
            
        raw_content = data['choices'][0]['message']['content'].strip()
        
        # Robust JSON extraction
        try:
            content = json.loads(raw_content)
        except json.JSONDecodeError:
            start = raw_content.find('{')
            end = raw_content.rfind('}')
            if start != -1 and end != -1:
                try:
                    content = json.loads(raw_content[start:end+1])
                except:
                    cleaned = raw_content.replace("```json", "").replace("```", "").strip()
                    content = json.loads(cleaned)
            else:
                cleaned = raw_content.replace("```json", "").replace("```", "").strip()
                content = json.loads(cleaned)
        
        return content
    except Exception as e:
        print(f"[HEALTH ANALYZE ERROR] {e}")
        # Fallback response
        return {
            "analysis": "Unable to generate AI analysis at the moment, but your records are saved.",
            "recommendations": ["Monitor your vitals", "Stay hydrated", "Consult doctor if feeling unwell"]
        }

# Speech
class SpeechRequest(BaseModel):
    text: str
    language: str
    user_id: Optional[int] = None
    gender: Optional[str] = None
    pitch: Optional[float] = None
    rate: Optional[float] = None
    clarity: Optional[float] = None
    model: Optional[str] = None

@app.post("/api/generate-speech")
async def generate_speech(request: SpeechRequest):
    if not request.text or not request.text.strip():
        print("[TTS] Empty text received, skipping.")
        return JSONResponse(content={"error": "Empty text"}, status_code=400)
    
    try:
        # Default fallback
        lang_code = request.language.split('-')[0]
        voice = NEURAL_VOICES.get(lang_code, 'en-US-ChristopherNeural')
        
        rate = "+0%"
        pitch = "+0Hz" # edge-tts 7.2.7+ requires Hz for pitch validation
        volume = "+0%"

        # User-specific voice preference
        pref_gender = request.gender # Prioritize explicitly passed gender
        
        if request.user_id:
            user = db_ops.get_user_by_id(request.user_id)
            if user:
                # 1. Custom Pitch & Rate (Prioritize request over DB)
                u_pitch = request.pitch if request.pitch is not None else (user.get('ai_voice_pitch') if user.get('ai_voice_pitch') is not None else 1.0)
                u_rate = request.rate if request.rate is not None else (user.get('ai_voice_rate') if user.get('ai_voice_rate') is not None else 1.0)
                
                # Convert float to edge-tts Hz format (edge-tts 7.2.7 strict regex: ^[+-]\d+Hz$)
                p_val = int((u_pitch - 1.0) * 100) # Map 0.5-2.0 to approx -50% to +100%
                # edge-tts 7.2.7+ strict regex: ^[+-]\d+Hz$
                pitch = f"{'+' if p_val >= 0 else ''}{p_val}Hz"
                
                r_val = int((u_rate - 1.0) * 100)
                rate = f"{'+' if r_val >= 0 else ''}{r_val}%"

                # New: Map Clarity to Volume (0.5 - 2.0 -> -50% to +50%)
                u_clarity = request.clarity if hasattr(request, 'clarity') and request.clarity is not None else (user.get('ai_voice_clarity') if user.get('ai_voice_clarity') is not None else 1.0)
                vol_val = int((u_clarity - 1.0) * 50)
                volume = f"{'+' if vol_val >= 0 else ''}{vol_val}%"

                # 2. Check if they have a specific URI saved
                if user.get('preferred_voice_uri'):
                    voice = user.get('preferred_voice_uri')
                
                # 3. Use gender if not already set by request
                if not pref_gender:
                    pref_gender = user.get('ai_voice_gender')

        # 4. Voice Model Logic (Overrides defaults if model is specified)
        if request.model and request.language.startswith('en'):
            m = request.model.lower()
            g = (pref_gender or 'Female').lower()
            if m == 'gemini-neural': # British "AI" feel
                voice = 'en-GB-SoniaNeural' if g == 'female' else 'en-GB-RyanNeural'
            elif m == 'gemini-enhanced': # Australian "Premium" feel
                voice = 'en-AU-NatashaNeural' if g == 'female' else 'en-AU-WilliamNeural'
            elif m == 'edge-standard': # American "Alternative"
                voice = 'en-US-MichelleNeural' if g == 'female' else 'en-US-EricNeural'
            # edge-neural (default) falls through to standard map

        # 5. Apply gender map if we have a preference (from request or DB) AND voice wasn't set by model above
        # Robust Script Detection for Indian Languages (Fix for mismatch between lang_code and text content)
        detected_lang = lang_code
        if re.search(r'[\u0C80-\u0CFF]', request.text): detected_lang = 'kn' # Kannada
        elif re.search(r'[\u0C00-\u0C7F]', request.text): detected_lang = 'te' # Telugu
        elif re.search(r'[\u0B80-\u0BFF]', request.text): detected_lang = 'ta' # Tamil
        elif re.search(r'[\u0D00-\u0D7F]', request.text): detected_lang = 'ml' # Malayalam
        elif re.search(r'[\u0980-\u09FF]', request.text): detected_lang = 'bn' # Bengali
        elif re.search(r'[\u0A80-\u0AFF]', request.text): detected_lang = 'gu' # Gujarati
        elif re.search(r'[\u0A00-\u0A7F]', request.text): detected_lang = 'pa' # Punjabi
        elif re.search(r'[\u0B00-\u0B7F]', request.text): detected_lang = 'or' # Odia
        elif re.search(r'[\u0600-\u06FF]', request.text): detected_lang = 'ur' # Urdu
        elif re.search(r'[\u0900-\u097F]', request.text): detected_lang = 'hi' # Hindi/Marathi
        
        if detected_lang != lang_code:
            print(f"[TTS] Script mismatch detected! Switched from {lang_code} to {detected_lang}")
            lang_code = detected_lang

        if pref_gender:
            # Normalize gender to TitleCase (Female, Male)
            p_gender = pref_gender.strip().title()
            
            gender_map = {
                'en': {'Male': 'en-US-ChristopherNeural', 'Female': 'en-US-JennyNeural'},
                'hi': {'Male': 'hi-IN-MadhurNeural', 'Female': 'hi-IN-SwaraNeural'},
                'te': {'Male': 'te-IN-MohanNeural', 'Female': 'te-IN-ShrutiNeural'},
                'ta': {'Male': 'ta-IN-ValluvarNeural', 'Female': 'ta-IN-PallaviNeural'},
                'kn': {'Male': 'kn-IN-GaganNeural', 'Female': 'kn-IN-SapnaNeural'},
                'ml': {'Male': 'ml-IN-MidhunNeural', 'Female': 'ml-IN-SobhanaNeural'},
                'mr': {'Male': 'mr-IN-ManoharNeural', 'Female': 'mr-IN-AarohiNeural'},
                'gu': {'Male': 'gu-IN-NiranjanNeural', 'Female': 'gu-IN-DhwaniNeural'},
                'bn': {'Male': 'bn-IN-BashkarNeural', 'Female': 'bn-IN-TanishaaNeural'},
                'pa': {'Male': 'pa-IN-WaseemNeural', 'Female': 'pa-IN-KulwinderNeural'},
                'ur': {'Male': 'ur-IN-SalmanNeural', 'Female': 'ur-IN-GulNeural'},
                'or': {'Male': 'or-IN-SubhashiniNeural', 'Female': 'or-IN-SubhashiniNeural'},
            }
            if lang_code in gender_map:
                prev_voice = voice
                voice = gender_map[lang_code].get(p_gender, voice)
                # Backup check: if requested Male but only Female exists or vice versa, it stays as is
                print(f"[TTS] Gender map applied: {prev_voice} -> {voice} (Gender: {p_gender})")

        print(f"[TTS] Generating: voice={voice}, pitch={pitch}, rate={rate}, text_len={len(request.text)}")
        communicate = edge_tts.Communicate(request.text, voice, rate=rate, pitch=pitch)
        
        async def tts_stream_generator():
            count = 0
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
                    count += 1
            if count == 0:
                print("[TTS ERROR] No audio chunks produced")
        
        return StreamingResponse(tts_stream_generator(), media_type="audio/mpeg")
    except Exception as e:
        print(f"[TTS ERROR] Exception during generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Appointments
@app.post("/appointments")
async def create_appointment_endpoint(appo: Appointment):
    res = db_ops.add_appointment(appo.user_id, appo.doctor_name, appo.date, appo.time, appo.reason)
    return {"success": True, "appointment": res}

@app.get("/appointments")
async def get_appointments_endpoint(user_id: int):
    return {"appointments": db_ops.get_appointments(user_id)}

@app.delete("/appointments/{appointment_id}")
async def delete_appointment_endpoint(appointment_id: int):
    success = db_ops.delete_appointment(appointment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Appointment not found or already deleted")
    return {"success": True}

@app.put("/appointments/{appointment_id}")
async def update_appointment_endpoint(appointment_id: int, appo: Appointment):
    success = db_ops.update_appointment(appointment_id, appo.doctor_name, appo.date, appo.time, appo.reason)
    if not success:
        raise HTTPException(status_code=404, detail="Appointment not found or failed to update")
    return {"success": True}

# Admin Stats
@app.get("/admin/stats")
async def get_admin_stats_endpoint():
    stats = db_ops.get_admin_stats()
    return stats

@app.get("/admin/monitor")
async def get_admin_monitor_endpoint():
    """Real-time system health metrics powered by psutil"""
    import psutil, time, sqlite3 as _sqlite3

    # --- CPU ---
    cpu_pct = psutil.cpu_percent(interval=0.2)
    cpu_cores = psutil.cpu_count(logical=True)

    # --- Memory ---
    mem = psutil.virtual_memory()
    mem_used_gb  = round(mem.used  / (1024**3), 2)
    mem_total_gb = round(mem.total / (1024**3), 2)
    mem_pct      = mem.percent

    # --- Disk ---
    disk = psutil.disk_usage('/')
    disk_used_gb  = round(disk.used  / (1024**3), 1)
    disk_total_gb = round(disk.total / (1024**3), 1)
    disk_pct      = disk.percent

    # --- Process Uptime ---
    proc = psutil.Process()
    uptime_secs = int(time.time() - proc.create_time())
    h, rem = divmod(uptime_secs, 3600)
    m, s   = divmod(rem, 60)
    uptime_str = f"{h}h {m}m {s}s"

    # --- DB Latency (real query timing) ---
    db_latency_ms = 0
    db_row_counts = {}
    try:
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "elderly_guardian.db")
        t0 = time.perf_counter()
        conn = _sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM appointments WHERE date >= date('now')")
        upcoming_appts = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM medicines WHERE taken=0 OR taken IS NULL")
        pending_meds = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM vitals")
        vitals_count = cur.fetchone()[0]
        conn.close()
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        db_row_counts = {
            "users": user_count,
            "upcoming_appointments": upcoming_appts,
            "pending_medicines": pending_meds,
            "vitals_recorded": vitals_count,
        }
    except Exception as db_err:
        db_latency_ms = -1

    # --- Network I/O snapshot ---
    net = psutil.net_io_counters()
    net_sent_mb = round(net.bytes_sent / (1024**2), 1)
    net_recv_mb = round(net.bytes_recv / (1024**2), 1)

    return {
        "cpu": {
            "percent": cpu_pct,
            "cores": cpu_cores,
        },
        "memory": {
            "used_gb": mem_used_gb,
            "total_gb": mem_total_gb,
            "percent": mem_pct,
        },
        "disk": {
            "used_gb": disk_used_gb,
            "total_gb": disk_total_gb,
            "percent": disk_pct,
        },
        "db": {
            "latency_ms": db_latency_ms,
            "mode": "Supabase" if USE_SUPABASE else "SQLite",
            **db_row_counts,
        },
        "network": {
            "sent_mb": net_sent_mb,
            "recv_mb": net_recv_mb,
        },
        "system": {
            "uptime": uptime_str,
        }
    }

# Community Chat & Admin
@app.get("/api/channels")
async def get_channels_endpoint():
    channels = db_ops.get_channels_with_meta()
    return {"channels": channels}

class ChannelCreate(BaseModel):
    id: str
    name: str
    read_only: bool = False

@app.post("/api/channels")
async def create_channel_endpoint(ch: ChannelCreate):
    if db_ops.create_channel(ch.id, ch.name, ch.read_only):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to create channel")

class ChannelUpdate(BaseModel):
    name: str
    read_only: bool

@app.put("/api/channels/{channel_id}")
async def update_channel_endpoint(channel_id: str, ch: ChannelUpdate):
    if db_ops.update_channel(channel_id, ch.name, ch.read_only):
        return {"success": True}
    return {"success": False}

@app.delete("/api/channels/{channel_id}")
async def delete_channel_endpoint(channel_id: str):
    db_ops.delete_channel(channel_id)
    return {"success": True}

@app.delete("/api/channels/{channel_id}/messages")
async def clear_channel_messages_endpoint(channel_id: str):
    db_ops.clear_channel_messages(channel_id)
    return {"success": True}

class WhitelistRequest(BaseModel):
    user_id: int

@app.post("/api/channels/{channel_id}/whitelist")
async def add_whitelist_endpoint(channel_id: str, rec: WhitelistRequest):
    if db_ops.add_channel_whitelist(channel_id, rec.user_id):
        return {"success": True}
    return {"success": False, "detail": "Already whitelisted or error"}

@app.delete("/api/channels/{channel_id}/whitelist/{user_id}")
async def remove_whitelist_endpoint(channel_id: str, user_id: int):
    db_ops.remove_channel_whitelist(channel_id, user_id)
    return {"success": True}

# =====================
# CHANNEL ROLES ENDPOINTS
# =====================

class RoleAssignment(BaseModel):
    user_id: int
    role: str  # 'owner', 'moderator', 'member'

@app.get("/api/channels/{channel_id}/roles")
async def get_roles(channel_id: str):
    """Get all users with roles in a channel"""
    roles = db_ops.get_channel_roles(channel_id)
    return {"roles": roles}

@app.post("/api/channels/{channel_id}/roles")
async def assign_role(channel_id: str, assignment: RoleAssignment, requester_id: int = None):
    """Assign a role to a user (owners or admins can do this)"""
    if requester_id:
        # Check if requester is owner OR admin
        requester_role = db_ops.get_user_channel_role(channel_id, requester_id)
        
        # Check if user is admin
        user = db_ops.get_user_by_id(requester_id)
        is_admin = user and user.get('role', '').lower() in ['admin', 'staff']
        
        if requester_role != 'owner' and not is_admin:
            raise HTTPException(status_code=403, detail="Only channel owners or admins can assign roles")
    
    success = db_ops.set_channel_role(channel_id, assignment.user_id, assignment.role)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid role. Use 'owner', 'moderator', or 'member'")
    return {"success": True}

@app.delete("/api/channels/{channel_id}/roles/{user_id}")
async def delete_role(channel_id: str, user_id: int, requester_id: int = None):
    """Remove a user's role from a channel (owners or admins can do this)"""
    if requester_id:
        requester_role = db_ops.get_user_channel_role(channel_id, requester_id)
        
        # Check if user is admin
        user = db_ops.get_user_by_id(requester_id)
        is_admin = user and user.get('role', '').lower() in ['admin', 'staff']
        
        if requester_role != 'owner' and not is_admin:
            raise HTTPException(status_code=403, detail="Only channel owners or admins can remove roles")
    
    db_ops.remove_channel_role(channel_id, user_id)
    return {"success": True}

@app.get("/api/channels/{channel_id}/roles/{user_id}")
async def get_user_role_endpoint(channel_id: str, user_id: int):
    """Get a specific user's role in a channel"""
    role = db_ops.get_user_channel_role(channel_id, user_id)
    return {"role": role, "is_moderator": role in ['owner', 'moderator']}

@app.get("/api/chat/history")
async def get_chat_history_endpoint(channel: str = "general"):
    history = db_ops.get_chat_history(channel)
    return {"history": history}

class ChatMessage(BaseModel):
    user_id: int
    message: str
    channel: str = "general"
    reply_to_id: int = None
    attachment_url: str = None
    attachment_type: str = None

@app.post("/api/chat/send")
async def send_chat_message_endpoint(msg: ChatMessage):
    # Permission checks (simplified for parity across drivers)
    user = db_ops.get_user_by_id(msg.user_id)
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.get('banned_until'): raise HTTPException(status_code=403, detail="Globally banned")
    
    # Send message
    db_ops.add_chat_message(msg.user_id, msg.message, msg.channel, msg.reply_to_id, msg.attachment_url, msg.attachment_type)
    return {"success": True}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{datetime.now().timestamp()}{file_ext}"
        path = os.path.join("uploads", filename)
        
        with open(path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        return {"url": f"http://localhost:8004/uploads/{filename}", "type": file.content_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users")
async def get_all_community_users(channel_id: str = None):
    users = db_ops.get_all_users_with_bans(channel_id)
    return {"users": users}

@app.delete("/api/chat/message/{msg_id}")
async def delete_chat_message_endpoint(msg_id: int):
    db_ops.delete_chat_message(msg_id)
    return {"success": True}

class MessageEdit(BaseModel):
    message: str
    user_id: int # Requirement for verification

@app.put("/api/chat/message/{msg_id}")
async def edit_chat_message_endpoint(msg_id: int, edit: MessageEdit):
    # 1-Hour Security Check
    msg = db_ops.get_chat_message_data(msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    owner_id = msg['user_id']
    ts = msg['timestamp']
    channel = msg['channel']
    
    # Check if user is admin
    user = db_ops.get_user_by_id(edit.user_id)
    is_admin = user and user.get('role', '').lower() in ['admin', 'staff']
    
    if owner_id != edit.user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this message")
        
    # Time limit check for non-admins
    if not is_admin:
        try:
            ts_clean = ts.replace("Z", "+00:00") if ts else ""
            if " " in ts_clean and "+" not in ts_clean and "-" not in ts_clean[-6:]:
                sent_at = datetime.strptime(ts_clean, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            else:
                sent_at = datetime.fromisoformat(ts_clean)
            
            if datetime.now(timezone.utc) - sent_at > timedelta(hours=1):
                raise HTTPException(status_code=403, detail="Messages can only be edited within 1 hour")
        except (ValueError, TypeError):
            pass
        
    db_ops.add_chat_message(edit.user_id, f"(Edited) {edit.message}", channel, reply_to_id=msg_id)
    return {"success": True}


# Admin / Moderation
@app.get("/admin/users")
async def get_admin_users_endpoint():
    users = db_ops.get_admin_users_list()
    return {"users": users}

@app.post("/admin/users/{user_id}/ban")
async def admin_ban_user_endpoint(user_id: int, request: Request):
    data = await request.json() if request.headers.get('content-type') == 'application/json' else {}
    reason = data.get('reason', 'Violating community guidelines')
    db_ops.ban_user_globally(user_id, reason)
    db_ops.log_audit(data.get('banned_by', 1), "GLOBAL_BAN", f"Banned user {user_id}: {reason}")
    return {"success": True}

@app.post("/admin/users/{user_id}/unban")
async def admin_unban_user_endpoint(user_id: int):
    db_ops.unban_user(user_id)
    return {"success": True}

@app.get("/api/users/{user_id}/status")
async def get_user_status(user_id: int):
    user = db_ops.get_user_by_id(user_id)
    if user:
        return {
            "role": user.get("role"),
            "banned_until": user.get("banned_until"),
            "name": user.get("name"),
            "ban_reason": user.get("ban_reason"),
            "avatar_url": user.get("avatar_url")
        }
    raise HTTPException(status_code=404, detail="User not found")

# Deprecated but kept for compatibility with chat context menu
@app.post("/api/users/{user_id}/ban")
async def ban_user_endpoint(user_id: int):
    db_ops.ban_user_hard(user_id)
    return {"success": True}

# Reporting System
@app.post("/api/reports")
async def create_report_endpoint(request: Request):
    data = await request.json()
    db_ops.create_report(
        data.get('reporter_id'),
        data.get('reported_id'),
        data.get('channel_id') if data.get('channel_id') != 'dm' else -1,
        data.get('reason')
    )
    return {"success": True}

@app.get("/admin/reports")
async def get_reports_endpoint():
    reports = db_ops.get_reports_list()
    return {"reports": reports}

@app.post("/admin/reports/{id}/dismiss")
async def dismiss_report_endpoint(id: int, admin_id: int):
    db_ops.update_report_status(id, 'dismissed')
    return {"success": True}

@app.post("/admin/reports/{id}/resolve")
async def resolve_report_endpoint(id: int, admin_id: int):
    db_ops.update_report_status(id, 'resolved')
    return {"success": True}

@app.delete("/api/reports/{report_id}")
async def delete_report_endpoint(report_id: int):
    db_ops.delete_report(report_id)
    return {"success": True}

# --- Audit Logs & Role Management ---

def log_audit(user_id: int, action: str, details: str):
    db_ops.log_audit(user_id, action, details)

@app.get("/api/audit-logs")
async def get_audit_logs():
    logs = db_ops.get_audit_logs_list()
    return {"logs": logs}

class RoleUpdate(BaseModel):
    role: str

@app.put("/api/users/{user_id}/role")
async def update_user_role_endpoint(user_id: int, update: RoleUpdate):
    db_ops.update_user_role(user_id, update.role)
    db_ops.log_audit(1, "ROLE_CHANGE", f"Changed user {user_id} role to {update.role}")
    return {"success": True}

class AvatarUpdate(BaseModel):
    avatar_url: str

@app.put("/api/users/{user_id}/avatar")
async def update_user_avatar_endpoint(user_id: int, update: AvatarUpdate):
    db_ops.update_user_avatar(user_id, update.avatar_url)
    return {"success": True, "avatar_url": update.avatar_url}

# --- Channel Bans System ---

@app.post("/api/channels/{channel_id}/ban")
async def ban_user_from_channel(channel_id: str, request: Request):
    data = await request.json()
    user_id = data.get('user_id')
    reason = data.get('reason', 'No reason provided')
    banned_by = data.get('banned_by')

    db_ops.ban_user_from_channel(user_id, channel_id, reason, banned_by)
    db_ops.log_audit(banned_by, "CHANNEL_BAN", f"Banned user {user_id} from channel {channel_id}: {reason}")
    return {"success": True}

@app.delete("/api/channels/{channel_id}/ban/{user_id}")
async def unban_user_from_channel(channel_id: str, user_id: int):
    db_ops.unban_user_from_channel(user_id, channel_id)
    db_ops.log_audit(1, "CHANNEL_UNBAN", f"Unbanned user {user_id} from channel {channel_id}") # Assuming Admin ID 1 for now if not passed
    return {"success": True}

@app.get("/api/channels/{channel_id}/bans")
async def get_channel_bans_endpoint(channel_id: str):
    bans = db_ops.get_channel_bans_list(channel_id)
    return {"bans": bans}

@app.get("/api/users/{user_id}/channel-bans")
async def get_user_channel_bans_endpoint(user_id: int):
    banned_channels = db_ops.get_user_channel_bans_dict(user_id)
    return {"banned_channels": banned_channels}

# --- Missing Admin Endpoints ---

@app.get("/admin/analytics")
async def get_admin_analytics_endpoint(days: int = 30):
    analytics = db_ops.get_admin_analytics(days)
    return analytics

@app.get("/admin/tasks")
async def get_admin_tasks_endpoint():
    tasks = db_ops.get_admin_tasks()
    return tasks

@app.get("/admin/locations")
async def get_admin_locations_endpoint(minutes: int = 60):
    locations = db_ops.get_active_user_locations(minutes)
    return {"locations": locations}

@app.post("/admin/clear-data")
async def clear_data_endpoint():
    """Clear all system data (demo/fresh start)"""
    success = db_ops.clear_system_data()
    if success:
        return {"success": True, "message": "System data cleared successfully"}
    raise HTTPException(status_code=500, detail="Failed to clear data")

class LocationUpdate(BaseModel):
    user_id: int
    lat: float
    lng: float

@app.post("/api/location")
async def update_location_endpoint(request: Request):
    try:
        body = await request.json()
        
        # Permissive parsing to handle frontend cache mismatch (latitude vs lat)
        user_id = body.get("user_id") or body.get("id")
        lat = body.get("lat") or body.get("latitude")
        lng = body.get("lng") or body.get("longitude")
        
        if user_id is None or lat is None or lng is None:
            print(f"[WARN] Invalid location payload: {body}")
            return JSONResponse(status_code=422, content={"detail": "Missing required fields"})
            
        # Type enforcement
        user_id = int(user_id)
        lat = float(lat)
        lng = float(lng)
        
        success = db_ops.update_user_location(user_id, lat, lng)
        return {"success": success}
    except Exception as e:
        print(f"[ERROR] Location Update Failed: {e}")
        return JSONResponse(status_code=422, content={"detail": str(e)})

class AdminProfileUpdate(BaseModel):
    user_id: int
    email: str
    password: str

@app.post("/api/admin/profile")
async def update_admin_profile_endpoint(update: AdminProfileUpdate):
    success = db_ops.update_admin_credentials(update.user_id, update.email, update.password)
    if success:
        return {"success": True, "message": "Profile updated successfully"}
class AdminCreate(BaseModel):
    name: str
    email: str
    password: str

@app.post("/api/admin/create")
async def create_admin_endpoint(admin: AdminCreate):
    result = db_ops.create_admin(admin.name, admin.email, admin.password)
    if result:
        return {"success": True, "user": result}
    return JSONResponse(status_code=400, content={"success": False, "message": "Admin creation failed (email might exist)"})

@app.delete("/admin/users/{user_id}")
async def delete_user_endpoint(user_id: int):
    # Protection logic is now also in DB layer, but we catch it here too
    if user_id == 1:
        return {"success": False, "message": "Cannot delete Super Admin (ID 1)"}
        
    success = db_ops.delete_user(user_id)
    if success:
        db_ops.log_audit(1, "USER_DELETE", f"Deleted user {user_id}")
        return {"success": True}
    return {"success": False, "message": "Failed to delete user"}


# --- Database Management & Sync ---

@app.get("/api/admin/db/status")
async def get_db_status():
    """Return info about current DB and row counts for comparison"""
    try:
        from db_sync import SYNC_TABLES, get_sqlite_conn, get_supabase_client
        
        status = {
            "active_db": "Supabase" if USE_SUPABASE else "SQLite",
            "supabase_configured": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY")),
            "tables": {}
        }
        
        # Get Local Counts
        local_conn = get_sqlite_conn()
        local_cursor = local_conn.cursor()
        
        # Get Cloud Counts
        supabase = None
        if status["supabase_configured"]:
            try:
                supabase = get_supabase_client()
            except: pass

        for table in SYNC_TABLES:
            # Local
            local_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            l_count = local_cursor.fetchone()[0]
            
            # Cloud
            c_count = 0
            if supabase:
                try:
                    res = supabase.table(table).select("count", count="exact").execute()
                    c_count = res.count
                except: pass
                
            status["tables"][table] = {
                "local": l_count,
                "cloud": c_count,
                "diff": abs(l_count - c_count)
            }
            
        local_conn.close()
        return status
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/admin/db/sync")
async def trigger_db_sync(direction: str = "push"): # "push" (local->cloud) or "pull" (cloud->local)
    """Trigger data synchronization"""
    try:
        if direction == "push":
            success = db_sync.sync_local_to_cloud()
        else:
            success = db_sync.sync_cloud_to_local()
            
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/db/toggle")
async def toggle_db_mode():
    """Update .env and return status. User should restart backend manually or wait for auto-reload."""
    try:
        env_path = ".env"
        current_val = os.getenv("USE_SUPABASE", "false").lower() == "true"
        new_val = not current_val
        
        # Update .env file
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                lines = f.readlines()
        
        found = False
        with open(env_path, "w") as f:
            for line in lines:
                if line.startswith("USE_SUPABASE="):
                    f.write(f"USE_SUPABASE={'true' if new_val else 'false'}\n")
                    found = True
                else:
                    f.write(line)
            if not found:
                f.write(f"\nUSE_SUPABASE={'true' if new_val else 'false'}\n")
                
        return {
            "success": True, 
            "new_mode": "Supabase" if new_val else "SQLite",
            "message": "Mode updated in .env. Please restart the backend to apply."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================
# DIRECT MESSAGES API
# =====================

class DMMessage(BaseModel):
    message: str
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None

@app.get("/api/dm/conversations/{user_id}")
async def get_user_dm_conversations(user_id: int):
    """Get all DM conversations for a user"""
    conversations = db_ops.get_dm_conversations(user_id)
    return {"conversations": conversations}

@app.get("/api/dm/{user_id}/messages/{other_user_id}")
async def get_dm_messages(user_id: int, other_user_id: int):
    """Get DM history between two users"""
    messages = db_ops.get_dm_history(user_id, other_user_id)
    # Mark as read when fetching
    db_ops.mark_dms_read(user_id, other_user_id)
    return {"messages": messages}

@app.post("/api/dm/{sender_id}/send/{receiver_id}")
async def send_dm_message(sender_id: int, receiver_id: int, dm: DMMessage):
    """Send a direct message"""
    try:
        result = db_ops.send_dm(sender_id, receiver_id, dm.message, dm.attachment_url, dm.attachment_type)
        return {"success": True, "message": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/dm/{user_id}/block/{target_id}")
async def block_user(user_id: int, target_id: int):
    """Block a user from DMs"""
    db_ops.block_user_dm(user_id, target_id)
    return {"success": True}

@app.delete("/api/dm/{user_id}/block/{target_id}")
async def unblock_user(user_id: int, target_id: int):
    """Unblock a user"""
    db_ops.unblock_user_dm(user_id, target_id)
    return {"success": True}

@app.get("/api/dm/{user_id}/blocks")
async def list_blocked_users(user_id: int):
    """Get list of blocked users"""
    blocked = db_ops.get_blocked_users(user_id)
    return {"blocked_ids": blocked}

@app.get("/api/dm/{user_id}/is-blocked/{other_id}")
async def check_dm_block(user_id: int, other_id: int):
    """Check if DM is blocked between users"""
    blocked = db_ops.is_dm_blocked(user_id, other_id)
    return {"blocked": blocked}

@app.post("/api/dm/{user_id}/read/{other_user_id}")
async def mark_dm_as_read(user_id: int, other_user_id: int):
    """Mark all DMs from other user as read"""
    count = db_ops.mark_dms_read(user_id, other_user_id)
    return {"success": True, "marked_read": count}

@app.post("/api/dm/clear")
async def clear_dm_chat(request: Request):
    """Clear whole DM conversation history"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        other_id = data.get('other_id')
        if not user_id or not other_id:
            return {"success": False, "error": "Missing user_id or other_id"}
            
        db_ops.clear_dm_history(int(user_id), int(other_id))
        return {"success": True}
    except Exception as e:
        print(f"Clear DM Error: {e}")
        return {"success": False, "error": str(e)}

@app.put("/api/dm/message/{msg_id}")
async def edit_dm_msg(msg_id: int, edit: MessageEdit):
    """Edit a DM message with 1 hour limit"""
    msg = db_ops.get_dm_message(msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="DM not found")
        
    sender_id = msg['sender_id']
    ts = msg['timestamp']
    
    if sender_id != edit.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Robust timestamp parsing
    try:
        ts_clean = ts.replace("Z", "+00:00") if ts else ""
        if " " in ts_clean and "+" not in ts_clean and "-" not in ts_clean[-6:]:
            # SQLite default format: "YYYY-MM-DD HH:MM:SS" (no timezone)
            sent_at = datetime.strptime(ts_clean, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        else:
            sent_at = datetime.fromisoformat(ts_clean)
        
        if datetime.now(timezone.utc) - sent_at > timedelta(hours=1):
            raise HTTPException(status_code=403, detail="Can only edit within 1 hour")
    except (ValueError, TypeError):
        # If timestamp parsing fails, allow edit (graceful fallback)
        pass
        
    db_ops.update_dm_message(msg_id, edit.message)
    return {"success": True}

@app.delete("/api/dm/message/{msg_id}")
async def delete_dm_message_endpoint(msg_id: int):
    """Delete a DM message"""
    db_ops.delete_dm_message(msg_id)
    return {"success": True}

@app.post("/api/dm/message/{msg_id}/report")
async def report_dm_message_endpoint(msg_id: int, request: Request):
    """Report a DM message"""
    data = await request.json()
    reporter_id = data.get("reporter_id")
    reason = data.get("reason", "Inappropriate content in DM")
    
    msg = db_ops.get_dm_message(msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    sender_id = msg['sender_id']
    db_ops.create_report(reporter_id, sender_id, -1, f"[DM Message] {reason}") # -1 indicates DM
    return {"success": True}

# --- Location API ---

@app.post("/api/location")
async def update_location(update: LocationUpdate):
    """Update user's live location"""
    print(f"[LOCATION] Updating location for user {update.user_id}: {update.latitude}, {update.longitude}")
    try:
        success = db_ops.update_user_location(update.user_id, update.latitude, update.longitude)
        if success:
            return {"success": True}
        print(f"[LOCATION ERROR] Database update failed for user {update.user_id}")
        return JSONResponse(content={"success": False, "error": "Database update failed"}, status_code=500)
    except Exception as e:
        print(f"[LOCATION ERROR] Exception: {e}")
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


if __name__ == "__main__":
    cert_dir = os.path.join(os.path.dirname(__file__), "certs")
    cert_file = os.path.join(cert_dir, "cert.pem")
    key_file = os.path.join(cert_dir, "key.pem")

    if os.path.exists(cert_file) and os.path.exists(key_file):
        print("[SERVER] Starting with HTTPS (self-signed cert)")
        uvicorn.run(app, host="0.0.0.0", port=8007, ssl_certfile=cert_file, ssl_keyfile=key_file)
    else:
        print("[SERVER] No SSL certs found. Starting with HTTP. Run 'python generate_cert.py' to enable HTTPS.")
        uvicorn.run(app, host="0.0.0.0", port=8007)

