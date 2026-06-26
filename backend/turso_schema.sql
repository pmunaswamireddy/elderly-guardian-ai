CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                password TEXT DEFAULT 'password',
                phone TEXT,
                role TEXT DEFAULT 'user',
                banned_until TEXT,
                ban_reason TEXT,
                preferred_language TEXT DEFAULT 'en',
                emergency_contact_name TEXT,
                emergency_contact_phone TEXT,
                voice_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            , ai_enabled INTEGER DEFAULT 1, voice_reminders_enabled INTEGER DEFAULT 1, preferred_voice_uri TEXT, ai_always_active INTEGER DEFAULT 1, ai_voice_model TEXT DEFAULT 'edge-neural', ai_voice_pitch REAL DEFAULT 1.0, ai_voice_clarity REAL DEFAULT 1.0, avatar_url TEXT, booking_language TEXT DEFAULT 'en', booking_voice_gender TEXT DEFAULT 'Female', ai_voice_gender TEXT DEFAULT 'Male', ai_voice_rate REAL DEFAULT 1.0, ai_language TEXT DEFAULT 'en', theme TEXT DEFAULT 'light', font_size_scale REAL DEFAULT 1.0)
;

CREATE TABLE sqlite_sequence(name,seq)
;

CREATE TABLE medicines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                time TEXT NOT NULL,
                after_meal INTEGER DEFAULT 0,
                taken INTEGER DEFAULT 0,
                end_date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_taken_at TEXT, frequency TEXT DEFAULT 'daily',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
;

CREATE TABLE appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                doctor_name TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
;

CREATE TABLE vitals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                bp_systolic INTEGER,
                bp_diastolic INTEGER,
                sugar_level INTEGER,
                heart_rate INTEGER,
                notes TEXT,
                recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
;

CREATE TABLE medicine_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                medicine_id INTEGER,
                medicine_name TEXT,
                status TEXT, -- 'taken' or 'missed'
                taken_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (medicine_id) REFERENCES medicines (id)
            )
;

CREATE TABLE content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                type TEXT DEFAULT 'article',
                author_id INTEGER,
                status TEXT DEFAULT 'published',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users (id)
            )
;

CREATE TABLE media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                url TEXT NOT NULL,
                file_type TEXT,
                size INTEGER,
                uploader_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploader_id) REFERENCES users (id)
            )
;

CREATE TABLE audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource TEXT,
                details TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
;

CREATE TABLE site_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                branding_json TEXT,
                system_config_json TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
;

CREATE TABLE chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                message TEXT NOT NULL,
                channel TEXT DEFAULT 'general',
                reply_to_id INTEGER,
                attachment_url TEXT,
                attachment_type TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
;

CREATE TABLE channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                is_protected INTEGER DEFAULT 0,
                read_only INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
;

CREATE TABLE channel_whitelist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(channel_id, user_id)
            )
;

CREATE TABLE reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter_id INTEGER,
                reported_user_id INTEGER,
                content_id INTEGER,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reporter_id) REFERENCES users (id),
                FOREIGN KEY (reported_user_id) REFERENCES users (id)
            )
;

CREATE TABLE dm_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                attachment_url TEXT,
                attachment_type TEXT,
                read INTEGER DEFAULT 0,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY (sender_id) REFERENCES users (id),
                FOREIGN KEY (receiver_id) REFERENCES users (id)
            )
;

CREATE TABLE dm_blocks (
                user_id INTEGER NOT NULL,
                blocked_id INTEGER NOT NULL,
                PRIMARY KEY (user_id, blocked_id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (blocked_id) REFERENCES users (id)
            )
;

CREATE TABLE channel_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(channel_id, user_id)
            )
;

CREATE TABLE user_locations (
            user_id INTEGER PRIMARY KEY,
            latitude REAL,
            longitude REAL,
            updated_at TEXT,
            status TEXT DEFAULT 'active'
        )
;

CREATE TABLE reported_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER,
            reported_id INTEGER,
            channel_id INTEGER,
            reason TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
;

CREATE TABLE channel_bans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            channel_id TEXT,
            reason TEXT,
            banned_by INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
