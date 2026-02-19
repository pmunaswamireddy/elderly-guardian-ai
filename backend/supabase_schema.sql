-- Supabase Schema for Elderly Guardian AI (PostgreSQL)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT DEFAULT 'password',
    phone TEXT,
    role TEXT DEFAULT 'user',
    banned_until TIMESTAMPTZ,
    ban_reason TEXT,
    preferred_language TEXT DEFAULT 'en',
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    voice_enabled BOOLEAN DEFAULT TRUE,
    ai_enabled BOOLEAN DEFAULT TRUE,
    voice_reminders_enabled BOOLEAN DEFAULT TRUE,
    ai_always_active BOOLEAN DEFAULT TRUE,
    ai_language TEXT DEFAULT 'en',
    ai_voice_model TEXT DEFAULT 'edge-neural',
    ai_voice_pitch FLOAT DEFAULT 1.0,
    ai_voice_clarity FLOAT DEFAULT 0.85,
    ai_voice_gender TEXT DEFAULT 'Female',
    ai_voice_rate FLOAT DEFAULT 1.0,
    avatar_url TEXT,
    preferred_voice_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    time TEXT NOT NULL,
    after_meal BOOLEAN DEFAULT FALSE,
    taken BOOLEAN DEFAULT FALSE,
    frequency TEXT DEFAULT 'daily',
    end_date DATE,
    last_taken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Medicine History Table
CREATE TABLE IF NOT EXISTS medicine_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    medicine_id INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name TEXT,
    status TEXT, -- 'taken' or 'missed'
    taken_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Vitals Table
CREATE TABLE IF NOT EXISTS vitals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    sugar_level INTEGER,
    heart_rate INTEGER,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Content Management System (CMS)
CREATE TABLE IF NOT EXISTS content (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'article',
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Media Management
CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    file_type TEXT,
    size INTEGER,
    uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs for Security
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Site Config
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    branding_json JSONB DEFAULT '{}',
    system_config_json JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Channels Table
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    is_protected BOOLEAN DEFAULT FALSE,
    read_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    channel TEXT REFERENCES channels(id) ON DELETE CASCADE DEFAULT 'general',
    reply_to_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
    attachment_url TEXT,
    attachment_type TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Channel Whitelist Table
CREATE TABLE IF NOT EXISTS channel_whitelist (
    id SERIAL PRIMARY KEY,
    channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, user_id)
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Direct Messages Table
CREATE TABLE IF NOT EXISTS dm_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type TEXT,
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- DM Blocks Table
CREATE TABLE IF NOT EXISTS dm_blocks (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, blocked_id)
);

-- Channel Roles Table
CREATE TABLE IF NOT EXISTS channel_roles (
    id SERIAL PRIMARY KEY,
    channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, user_id)
);

-- Insert Default Channels
INSERT INTO channels (id, name, type, is_protected) VALUES 
('general', 'general-chat', 'text', TRUE),
('medicine', 'medicine-help', 'text', TRUE),
('doctors', 'ask-a-doctor', 'text', TRUE),
('announcements', 'announcements', 'text', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert Default Site Settings
INSERT INTO site_settings (id, branding_json, system_config_json) 
VALUES (1, '{}', '{}')
ON CONFLICT (id) DO NOTHING;
-- User Locations Table
CREATE TABLE IF NOT EXISTS user_locations (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    status TEXT DEFAULT 'active',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Channel Bans Table
CREATE TABLE IF NOT EXISTS channel_bans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
    reason TEXT,
    banned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, user_id)
);
