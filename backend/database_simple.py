import sqlite3
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

# Simple SQLite Database - Lightweight Alternative to SQLAlchemy
is_connected = True

TURSO_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if TURSO_URL and TURSO_TOKEN:
    import libsql_client

    class TursoRow(dict):
        def __init__(self, cols, values):
            super().__init__(zip(cols, values))
            self._values = tuple(values)
        def __getitem__(self, key):
            if isinstance(key, int):
                return self._values[key]
            return super().__getitem__(key)
        def keys(self):
            return super().keys()

    class TursoCursor:
        def __init__(self, client, connection):
            self.client = client
            self.connection = connection
            self.description = None
            self._fetchall_data = []
            self._fetchone_data = None
            self.lastrowid = None

        def execute(self, sql, params=()):
            result = self.client.execute(sql, params)
            cols = []
            if hasattr(result, "columns") and result.columns:
                self.description = [(col,) for col in result.columns]
                cols = result.columns
            else:
                self.description = None
            
            if hasattr(result, "rows"):
                if self.connection.row_factory:
                    self._fetchall_data = [TursoRow(cols, row) for row in result.rows]
                else:
                    self._fetchall_data = [tuple(row) for row in result.rows]
            else:
                self._fetchall_data = []
                
            self._fetchone_data = iter(self._fetchall_data)
            self.lastrowid = getattr(result, "last_insert_rowid", None)
            return self

        def fetchall(self):
            return self._fetchall_data

        def fetchone(self):
            try:
                return next(self._fetchone_data)
            except StopIteration:
                return None

    class TursoConnection:
        def __init__(self, url, token):
            self.client = libsql_client.create_client_sync(url, auth_token=token)
            self.row_factory = None
        def cursor(self):
            return TursoCursor(self.client, self)
        def commit(self):
            pass
        def close(self):
            self.client.close()

class SimpleDB:
    def __init__(self, db_path: str = "elderly_guardian.db"):
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self):
        if TURSO_URL and TURSO_TOKEN:
            return TursoConnection(TURSO_URL, TURSO_TOKEN)
        return sqlite3.connect(self.db_path)
    
    def init_database(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
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
                ai_enabled INTEGER DEFAULT 1,
                voice_reminders_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medicines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                time TEXT NOT NULL,
                after_meal INTEGER DEFAULT 0,
                taken INTEGER DEFAULT 0,
                frequency TEXT DEFAULT 'daily',
                end_date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        # Migration: Add columns if missing
        cursor.execute("PRAGMA table_info(medicines)")
        columns = [info[1] for info in cursor.fetchall()]
        if "end_date" not in columns:
            try: cursor.execute("ALTER TABLE medicines ADD COLUMN end_date TEXT")
            except: pass
        if "frequency" not in columns:
            try: cursor.execute("ALTER TABLE medicines ADD COLUMN frequency TEXT DEFAULT 'daily'")
            except: pass
        
        # Migration for user settings
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [info[1] for info in cursor.fetchall()]
        print(f"[DB DEBUG] Existing user columns: {user_columns}")
        
        if "ai_enabled" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN ai_enabled INTEGER DEFAULT 1")
                cursor.execute("ALTER TABLE users ADD COLUMN voice_reminders_enabled INTEGER DEFAULT 1")
                cursor.execute("ALTER TABLE users ADD COLUMN ai_language TEXT DEFAULT 'en'")
                print(f"[DB DEBUG] Added ai_enabled columns")
            except Exception as e:
                print(f"[DB DEBUG] Error adding ai_enabled columns: {e}")

        if "voice_enabled" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN voice_enabled INTEGER DEFAULT 1")
                print(f"[DB DEBUG] Added voice_enabled column")
            except Exception as e:
                print(f"[DB DEBUG] Error adding voice_enabled column: {e}")
        
        if "emergency_contact_name" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN emergency_contact_name TEXT")
                cursor.execute("ALTER TABLE users ADD COLUMN emergency_contact_phone TEXT")
            except:
                pass
        
        if "preferred_voice_uri" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN preferred_voice_uri TEXT")
            except:
                pass
        
        # Add AI voice settings columns
        if "theme" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light'")
                cursor.execute("ALTER TABLE users ADD COLUMN font_size_scale REAL DEFAULT 1.0")
                print(f"[DB DEBUG] Added theme & font_size_scale columns")
            except Exception as e:
                print(f"[DB DEBUG] Error adding theme columns: {e}")

        if "ai_always_active" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN ai_always_active INTEGER DEFAULT 1")
                print(f"[DB DEBUG] Added ai_always_active column")
            except Exception as e:
                print(f"[DB DEBUG] Error adding ai_always_active column: {e}")
        
        if "ai_voice_model" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN ai_voice_model TEXT DEFAULT 'edge-neural'")
                print(f"[DB DEBUG] Added ai_voice_model column")
            except Exception as e:
                print(f"[DB DEBUG] Error adding ai_voice_model column: {e}")
        
        if "ai_voice_pitch" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN ai_voice_pitch REAL DEFAULT 1.0")
                print(f"[DB DEBUG] Added ai_voice_pitch column")
            except Exception as e:
                print(f"[DB DEBUG] Error adding ai_voice_pitch column: {e}")
        
        if "ai_voice_clarity" not in user_columns:
            try: cursor.execute("ALTER TABLE users ADD COLUMN ai_voice_clarity REAL DEFAULT 0.85")
            except: pass

        if "avatar_url" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
                print(f"[DB DEBUG] Added avatar_url column")
            except Exception as e:
                print(f"[DB DEBUG] Error adding avatar_url column: {e}")

        if "ai_voice_gender" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN ai_voice_gender TEXT DEFAULT 'Male'")
                print(f"[DB DEBUG] Added ai_voice_gender column")
            except Exception as e:
                print(f"[DB DEBUG] ai_voice_gender column note: {e}")

        if "ai_voice_rate" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN ai_voice_rate REAL DEFAULT 1.0")
                print(f"[DB DEBUG] Added ai_voice_rate column")
            except Exception as e:
                print(f"[DB DEBUG] ai_voice_rate column note: {e}")

        if "ai_language" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN ai_language TEXT DEFAULT 'en'")
                print(f"[DB DEBUG] Added ai_language column")
            except Exception as e:
                print(f"[DB DEBUG] ai_language column note: {e}")

        if "booking_language" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN booking_language TEXT DEFAULT 'en'")
                print(f"[DB DEBUG] Added booking_language column")
            except Exception as e:
                print(f"[DB DEBUG] booking_language column note: {e}")

        if "booking_voice_gender" not in user_columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN booking_voice_gender TEXT DEFAULT 'Female'")
                print(f"[DB DEBUG] Added booking_voice_gender column")
            except Exception as e:
                print(f"[DB DEBUG] booking_voice_gender column note: {e}")

        # Ensure user_locations table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_locations (
                user_id INTEGER PRIMARY KEY,
                latitude REAL,
                longitude REAL,
                updated_at TEXT,
                status TEXT DEFAULT 'active'
            )
        """)
        
        conn.commit()

        # Create Medicine History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medicine_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                medicine_id INTEGER,
                medicine_name TEXT,
                status TEXT, -- 'taken' or 'missed'
                taken_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (medicine_id) REFERENCES medicines (id)
            )
        """)
        
        if "last_taken_at" not in columns:
            try:
                cursor.execute("ALTER TABLE medicines ADD COLUMN last_taken_at TEXT")
            except:
                pass

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                doctor_name TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vitals (
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
        """)

        # NEW: Content Management System (CMS)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content (
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
        """)

        # NEW: Media Management
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                url TEXT NOT NULL,
                file_type TEXT,
                size INTEGER,
                uploader_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploader_id) REFERENCES users (id)
            )
        """)

        # NEW: Audit Logs for Security
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource TEXT,
                details TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        # NEW: Site Config
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS site_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                branding_json TEXT,
                system_config_json TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Community Chat Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
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
        """)

        # Migration: Add is_deleted to chat_messages if missing
        cursor.execute("PRAGMA table_info(chat_messages)")
        chat_cols = [info[1] for info in cursor.fetchall()]
        if "is_deleted" not in chat_cols:
            try: cursor.execute("ALTER TABLE chat_messages ADD COLUMN is_deleted INTEGER DEFAULT 0")
            except: pass

        # Migration: Add channel to chat_messages if missing
        cursor.execute("PRAGMA table_info(chat_messages)")
        chat_cols = [info[1] for info in cursor.fetchall()]
        if "channel" not in chat_cols:
            try: cursor.execute("ALTER TABLE chat_messages ADD COLUMN channel TEXT DEFAULT 'general'")
            except: pass
        
        if "reply_to_id" not in chat_cols:
             try: cursor.execute("ALTER TABLE chat_messages ADD COLUMN reply_to_id INTEGER")
             except: pass

        if "attachment_url" not in chat_cols:
             try: 
                cursor.execute("ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT")
                cursor.execute("ALTER TABLE chat_messages ADD COLUMN attachment_type TEXT")
             except: pass

        # New: Channels Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                is_protected INTEGER DEFAULT 0,
                read_only INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration: Add read_only to channels if missing
        cursor.execute("PRAGMA table_info(channels)")
        channel_cols = [info[1] for info in cursor.fetchall()]
        if "read_only" not in channel_cols:
            try: cursor.execute("ALTER TABLE channels ADD COLUMN read_only INTEGER DEFAULT 0")
            except: pass
        
        # New: Channel Whitelist Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channel_whitelist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(channel_id, user_id)
            )
        """)
        
        # New: Reports Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
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
        """)

        # NEW: Direct Messages Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dm_messages (
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
        """)

        # Migration: Add is_deleted to dm_messages if missing
        cursor.execute("PRAGMA table_info(dm_messages)")
        dm_cols = [info[1] for info in cursor.fetchall()]
        if "is_deleted" not in dm_cols:
            try: cursor.execute("ALTER TABLE dm_messages ADD COLUMN is_deleted INTEGER DEFAULT 0")
            except: pass
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dm_blocks (
                user_id INTEGER NOT NULL,
                blocked_id INTEGER NOT NULL,
                PRIMARY KEY (user_id, blocked_id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (blocked_id) REFERENCES users (id)
            )
        ''')

        # NEW: Channel Roles Table (owner, moderator, member)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS channel_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(channel_id, user_id)
            )
        ''')

        # Default Channels
        cursor.execute("INSERT OR IGNORE INTO channels (id, name, type, is_protected) VALUES ('general', 'general-chat', 'text', 1)")
        cursor.execute("INSERT OR IGNORE INTO channels (id, name, type, is_protected) VALUES ('medicine', 'medicine-help', 'text', 1)")
        cursor.execute("INSERT OR IGNORE INTO channels (id, name, type, is_protected) VALUES ('doctors', 'ask-a-doctor', 'text', 1)")
        cursor.execute("INSERT OR IGNORE INTO channels (id, name, type, is_protected) VALUES ('announcements', 'announcements', 'text', 1)")

        # Medicine History for logs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medicine_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                medicine_id INTEGER,
                user_id INTEGER,
                medicine_name TEXT,
                status TEXT DEFAULT 'taken',
                taken_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (medicine_id) REFERENCES medicines (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Insert default settings if not exists
        cursor.execute("INSERT OR IGNORE INTO site_settings (id, branding_json, system_config_json) VALUES (1, '{}', '{}')")
        
        # New: User Locations Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_locations (
                user_id INTEGER PRIMARY KEY,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                status TEXT DEFAULT 'active',
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        conn.commit()
        conn.close()

    def add_history(self, user_id: int, medicine_id: int, medicine_name: str, status: str):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO medicine_history (user_id, medicine_id, medicine_name, status) VALUES (?, ?, ?, ?)",
            (user_id, medicine_id, medicine_name, status)
        )
        conn.commit()
        conn.close()

    def get_history(self, user_id: int, days: int = 60):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, medicine_id, medicine_name, status, taken_at 
            FROM medicine_history 
            WHERE user_id = ? AND taken_at >= datetime('now', ?) 
            ORDER BY taken_at DESC
            """,
            (user_id, f'-{days} days')
        )
        rows = cursor.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "medicine_id": row[1],
                "medicine_name": row[2],
                "status": row[3],
                "taken_at": row[4]
            })
        conn.close()
        return history

    def delete_history_item(self, history_id: int):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM medicine_history WHERE id = ?", (history_id,))
        conn.commit()
        conn.close()

    def mark_medicine_taken(self, medicine_id: int) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        
        # Update medicine status
        cursor.execute("UPDATE medicines SET taken = 1, last_taken_at = ? WHERE id = ?", (today_str, medicine_id))
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return success

# User Management Functions
def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Authenticate user and return user info"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    try:
        # First check what columns exist
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [info[1] for info in cursor.fetchall()]
        print(f"[AUTH DEBUG] Available columns: {existing_columns}")
        
        # Build dynamic SQL query based on available columns
        base_columns = ['id', 'name', 'email', 'role', 'banned_until', 'preferred_language']
        optional_columns = [
            'emergency_contact_name', 'emergency_contact_phone', 'voice_enabled', 
            'ai_enabled', 'voice_reminders_enabled', 'ai_language', 
            'preferred_voice_uri', 'ai_always_active', 'ai_voice_model', 
            'ai_voice_pitch', 'ai_voice_clarity', 'ai_voice_gender', 'ai_voice_rate'
        ]
        
        # Use only columns that exist
        selected_columns = base_columns.copy()
        for col in optional_columns:
            if col in existing_columns:
                selected_columns.append(col)
        
        query = f"SELECT {', '.join(selected_columns)} FROM users WHERE (email = ? OR name = ?) AND password = ?"
        print(f"[AUTH DEBUG] Query: {query}")
        
        cursor.execute(query, (email, email, password))
        row = cursor.fetchone()
        
        if not row:
            print(f"[AUTH DEBUG] No user found for email: {email}")
            return None
        
        # Build result dynamically
        result = {}
        for i, col_name in enumerate(selected_columns):
            val = row[i]
            
            # Handle Booleans
            if col_name in ['voice_enabled', 'ai_enabled', 'voice_reminders_enabled', 'ai_always_active']:
                result[col_name] = bool(val)
            # Handle Floats
            elif col_name in ['ai_voice_pitch', 'ai_voice_clarity', 'ai_voice_rate'] and val is not None:
                result[col_name] = float(val)
            else:
                result[col_name] = val
        
        # Set defaults for crucial missing fields (just in case)
        result.setdefault('ai_language', result.get('preferred_language', 'en'))
        result.setdefault('ai_voice_model', 'edge-neural')
        
        print(f"[AUTH DEBUG] Auth successful for user: {result.get('name')}")
        return result
        
        print(f"[AUTH DEBUG] Auth successful for user: {result['name']}")
        return result
        
    except Exception as e:
        print(f"[AUTH ERROR] Authentication failed: {e}")
        return None
    finally:
        conn.close()

def update_user_settings(user_id: int, settings: Dict) -> bool:
    """Update user settings - Supports partial updates"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    try:
        print(f"[DB DEBUG] Updating settings for user {user_id}: {settings}")
        
        # Define field handlers for specialized data types (booleans, floats)
        def handle_val(k, v):
            if k in ['voice_enabled', 'ai_enabled', 'voice_reminders_enabled', 'ai_always_active']:
                return 1 if v else 0
            if k in ['ai_voice_pitch', 'ai_voice_clarity', 'ai_voice_rate'] and v is not None:
                return float(v)
            return v

        # Build dynamic query
        fields = []
        values = []
        for k, v in settings.items():
            if k in ['id', 'email', 'created_at']: continue # Protected fields
            fields.append(f"{k} = ?")
            values.append(handle_val(k, v))
            
        if not fields:
            return True # Nothing to update
            
        sql = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
        values.append(user_id)
        
        cursor.execute(sql, tuple(values))
        conn.commit()
        
        success = cursor.rowcount > 0
        print(f"[DB DEBUG] Update successful: {success}, Rows: {cursor.rowcount}")
        return success
    except Exception as e:
        print(f"[DB ERROR] Error updating settings: {e}")
        return False
    finally:
        conn.close()

def delete_user(user_id: int) -> bool:
    """Delete a user and all related data"""
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        # Tables to clean up
        tables = [
            "medicines", "medicine_history", "appointments", "vitals", 
            "content", "media", "audit_logs", "chat_messages", 
            "channel_whitelist", "reports", "dm_messages", "dm_blocks",
            "channel_roles", "user_locations"
        ]
        
        for table in tables:
            try:
                # Check if it has user_id, sender_id, receiver_id etc.
                if table in ["dm_messages"]:
                    cursor.execute(f"DELETE FROM {table} WHERE sender_id = ? OR receiver_id = ?", (user_id, user_id))
                elif table in ["dm_blocks"]:
                     cursor.execute(f"DELETE FROM {table} WHERE user_id = ? OR blocked_id = ?", (user_id, user_id))
                else:
                    cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
            except:
                pass # Table might not have that column
        
        # Finally delete user
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"[DB ERROR] Error deleting user: {e}")
        return False
    finally:
        conn.close()

def update_admin_credentials(user_id: int, email: str, password: str) -> bool:
    """Update admin email and password"""
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET email = ?, password = ? WHERE id = ?", (email, password, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"[DB ERROR] Error updating admin credentials: {e}")
        return False
    finally:
        conn.close()

def get_user_by_id(user_id: int) -> Optional[Dict]:
    """Get user by ID with dynamic column mapping"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    try:
        # First check what columns exist
        cursor.execute("PRAGMA table_info(users)")
        columns_info = cursor.fetchall()
        existing_columns = [info[1] for info in columns_info]
        
        # Build dynamic SQL query based on all available columns
        # We exclude sensitive fields if they exist
        selected_columns = [col for col in existing_columns if col != 'password']
        
        query = f"SELECT {', '.join(selected_columns)} FROM users WHERE id = ?"
        
        cursor.execute(query, (user_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        # Build result dynamically using column names
        result = {}
        for i, col_name in enumerate(selected_columns):
            val = row[i]
            
            # Type handling and NULL protection
            if col_name in ['voice_enabled', 'ai_enabled', 'voice_reminders_enabled', 'ai_always_active']:
                result[col_name] = bool(val) if val is not None else True
            elif col_name in ['ai_voice_pitch', 'ai_voice_clarity', 'ai_voice_rate']:
                result[col_name] = float(val) if val is not None else 1.0
            else:
                result[col_name] = val
        
        # Ensure critical defaults only if truly missing (STRICT DECOUPLING)
        if result.get('preferred_language') is None: result['preferred_language'] = 'en'
        if result.get('ai_language') is None: result['ai_language'] = result['preferred_language']
        if result.get('booking_language') is None: result['booking_language'] = result['ai_language']
        if result.get('ai_voice_gender') is None: result['ai_voice_gender'] = 'Male'
        if result.get('booking_voice_gender') is None: result['booking_voice_gender'] = 'Female'
        
        return result
    except Exception as e:
        print(f"[DB ERROR] Error getting user by ID: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        conn.close()

# Database instance
db = SimpleDB()

# Helper functions for FastAPI endpoints
def get_medicines(user_id: int = 1) -> List[Dict]:
    """Get all medicines for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, dosage, time, after_meal, taken, frequency, end_date, last_taken_at
        FROM medicines 
        WHERE user_id = ?
        ORDER BY time
    """, (user_id,))
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    medicines = []
    for row in cursor.fetchall():
        # Check if actually taken TODAY
        last_taken = row[8]
        is_taken_today = (last_taken == today)
        
        medicines.append({
            "id": row[0],
            "name": row[1],
            "dosage": row[2],
            "time": row[3],
            "after_meal": bool(row[4]),
            "taken": is_taken_today,
            "frequency": row[6],
            "end_date": row[7],
            "last_taken_at": last_taken
        })
    
    conn.close()
    return medicines

def add_medicine(user_id: int, name: str, dosage: str, time: str, after_meal: bool, frequency: str = 'daily', end_date: str = None) -> Dict:
    """Add a new medicine for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO medicines (user_id, name, dosage, time, after_meal, frequency, taken, end_date)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    """, (user_id, name, dosage, time, int(after_meal), frequency, end_date))
    
    medicine_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": medicine_id,
        "name": name,
        "dosage": dosage,
        "time": time,
        "after_meal": after_meal,
        "frequency": frequency,
        "end_date": end_date,
        "taken": False
    }

def delete_medicine(medicine_id: int) -> bool:
    """Delete a medicine"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM medicines WHERE id = ?", (medicine_id,))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success
    
def update_medicine_details(medicine_id: int, name: str, dosage: str, time: str, after_meal: bool) -> bool:
    """Update medicine details (name, dosage, time, etc.)"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE medicines 
        SET name = ?, dosage = ?, time = ?, after_meal = ?
        WHERE id = ?
    """, (name, dosage, time, int(after_meal), medicine_id))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def update_medicine(medicine_id: int, taken: bool) -> bool:
    """Update medicine taken status with daily rescheduling and logs"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d") if taken else None
    
    # Get user_id and name first
    cursor.execute("SELECT user_id, name FROM medicines WHERE id = ?", (medicine_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    user_id, med_name = row[0], row[1]

    cursor.execute("""
        UPDATE medicines 
        SET taken = ?, last_taken_at = ? 
        WHERE id = ?
    """, (int(taken), today_str, medicine_id))
    
    if taken:
        cursor.execute("""
            INSERT INTO medicine_history (medicine_id, user_id, medicine_name, status, taken_at)
            VALUES (?, ?, ?, 'taken', datetime('now'))
        """, (medicine_id, user_id, med_name))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def mark_medicine_missed(medicine_id: int) -> bool:
    """Log a medicine as missed with precise timestamp"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # Get user_id
    cursor.execute("SELECT user_id, name FROM medicines WHERE id = ?", (medicine_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    user_id = row[0]
    med_name = row[1]

    # Log as missed in medicine_history
    cursor.execute("""
        INSERT INTO medicine_history (medicine_id, user_id, medicine_name, status, taken_at)
        VALUES (?, ?, ?, 'missed', datetime('now'))
    """, (medicine_id, user_id, med_name))
    
    # Also update the medicine's last_taken_at so we don't remind them again TODAY
    # even though they missed it, we consider the "slot" handled.
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("UPDATE medicines SET last_taken_at = ? WHERE id = ?", (today_str, medicine_id))
    
    conn.commit()
    conn.close()
    return True

def get_missed_medicines(user_id: int) -> List[Dict]:
    """Calculate missed medicines for the last 7 days"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, dosage, time, frequency 
        FROM medicines WHERE user_id = ?
    """, (user_id,))
    
    all_meds = [dict(row) for row in cursor.fetchall()]
    missed = []
    
    # Check last 7 days
    for day_offset in range(1, 8):
        check_date = (datetime.now() - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        
        for med in all_meds:
            # Simplified: checking if it was taken on that specific day
            cursor.execute("""
                SELECT 1 FROM medicine_logs 
                WHERE medicine_id = ? AND date(taken_at) = ?
            """, (med['id'], check_date))
            
            if not cursor.fetchone():
                missed.append({
                    "name": med['name'],
                    "dosage": med['dosage'],
                    "scheduled_time": f"{check_date} {med['time']}",
                    "status": "Missed"
                })
                
    conn.close()
    return missed

def get_appointments(user_id: int = 1) -> List[Dict]:
    """Get all appointments for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, doctor_name, date, time, reason 
        FROM appointments 
        WHERE user_id = ?
        ORDER BY date, time
    """, (user_id,))
    
    appointments = []
    for row in cursor.fetchall():
        appointments.append({
            "id": row[0],
            "doctor_name": row[1],
            "date": row[2],
            "time": row[3],
            "reason": row[4]
        })
    
    conn.close()
    return appointments

def add_appointment(user_id: int, doctor_name: str, date: str, time: str, reason: str) -> Dict:
    """Add a new appointment for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO appointments (user_id, doctor_name, date, time, reason)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, doctor_name, date, time, reason))
    
    appointment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": appointment_id,
        "doctor_name": doctor_name,
        "date": date,
        "time": time,
        "reason": reason
    }

def update_appointment(appointment_id: int, doctor_name: str, date: str, time: str, reason: str) -> bool:
    """Update an existing appointment"""
    try:
        print(f"[DB DEBUG] Updating appointment {appointment_id}: {doctor_name}, {date}, {time}")
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE appointments 
            SET doctor_name = ?, date = ?, time = ?, reason = ?
            WHERE id = ?
        """, (doctor_name, date, time, reason, appointment_id))
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return success
    except Exception as e:
        print(f"[DB ERROR] update_appointment: {e}")
        return False

def delete_appointment(appointment_id: int) -> bool:
    """Delete an appointment"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def save_vitals(user_id: int, bp_systolic: int, bp_diastolic: int, sugar_level: int, heart_rate: int, notes: str = ""):
    """Save vitals for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO vitals (user_id, bp_systolic, bp_diastolic, sugar_level, heart_rate, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, bp_systolic, bp_diastolic, sugar_level, heart_rate, notes))
    
    conn.commit()
    conn.close()
    return True

def get_latest_vitals(user_id: int = 1) -> Optional[Dict]:
    """Get latest vitals for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT bp_systolic, bp_diastolic, sugar_level, heart_rate, notes, recorded_at
        FROM vitals
        WHERE user_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1
    """, (user_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "bp": {"systolic": row[0], "diastolic": row[1], "last_checked": row[5]},
            "sugar": {"level": row[2], "last_checked": row[5]},
            "heart_rate": {"bpm": row[3], "last_checked": row[5]}
        }
    return None

def get_vitals_history(user_id: int, days: int = 30, limit: int = 100) -> List[Dict]:
    """Get vitals history with a day range threshold"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # Calculate the date threshold (ISO format)
    threshold = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute("""
        SELECT bp_systolic, bp_diastolic, sugar_level, heart_rate, notes, recorded_at
        FROM vitals
        WHERE user_id = ? AND recorded_at >= ?
        ORDER BY recorded_at DESC
        LIMIT ?
    """, (user_id, threshold, limit))
    
    history = []
    for row in cursor.fetchall():
        history.append({
            "bp_systolic": row[0],
            "bp_diastolic": row[1],
            "sugar_level": row[2],
            "heart_rate": row[3],
            "notes": row[4],
            "recorded_at": row[5]
        })
    
    conn.close()
    return history


def get_untaken_medicines_count(user_id: int = 1) -> int:
    """Get count of untaken medicines for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COUNT(*) 
        FROM medicines 
        WHERE user_id = ? AND taken = 0
    """, (user_id,))
    
    count = cursor.fetchone()[0]
    conn.close()
    return count




def update_user_location(user_id: int, lat: float, lng: float, data: Dict = None) -> bool:
    """Update user's real-time location"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.utcnow().isoformat()
    
    try:
        # Check if record exists
        cursor.execute("SELECT user_id FROM user_locations WHERE user_id = ?", (user_id,))
        exists = cursor.fetchone()
        
        if exists:
            cursor.execute("""
                UPDATE user_locations 
                SET latitude = ?, longitude = ?, updated_at = ? 
                WHERE user_id = ?
            """, (lat, lng, timestamp, user_id))
        else:
            cursor.execute("""
                INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, lat, lng, timestamp))
            
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB ERROR] update_user_location: {e}")
        return False
    finally:
        conn.close()

def get_active_user_locations(minutes: int = 60) -> List[Dict]:
    """Get latest locations of users active within the last N minutes (Deduplicated)"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Calculate threshold time
    threshold = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
    
    try:
        # We get the LATEST location record for EVERY user who has ever posted one
        cursor.execute("""
            SELECT ul.user_id, ul.latitude as lat, ul.longitude as lng, ul.updated_at as last_seen,
                   u.name, u.email, u.role
            FROM user_locations ul
            JOIN users u ON ul.user_id = u.id
            WHERE ul.id IN (
                SELECT id FROM user_locations 
                GROUP BY user_id
                ORDER BY updated_at DESC
            )
            GROUP BY ul.user_id
        """)
        
        locations = [dict(row) for row in cursor.fetchall()]
        return locations
    except Exception as e:
        print(f"[DB ERROR] get_active_user_locations: {e}")
        return []
    finally:
        conn.close()

def get_all_users() -> List[Dict]:

    """Get all users for admin dashboard"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, email, phone, role, banned_until, ban_reason, preferred_language, created_at
        FROM users
        ORDER BY created_at DESC
    """)
    
    users = []
    for row in cursor.fetchall():
        users.append({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "phone": row[3],
            "role": row[4],
            "banned_until": row[5],
            "ban_reason": row[6],
            "preferred_language": row[7],
            "created_at": row[8]
        })
    
    conn.close()
    return users

def create_guest_user() -> Optional[Dict]:
    """Create a temporary guest user with unique identifiers"""
    import uuid
    import random
    
    guest_id = str(uuid.uuid4())[:8]
    guest_name = f"Guest_{guest_id}"
    guest_email = f"guest_{guest_id}@elderlyguardian.com"
    guest_password = "guestpassword123" # Standard for all guests, but IDs are unique
    
    # Randomly assign a role or other temp attributes if needed
    user = create_user(guest_name, guest_email, guest_password, role="guest")
    if user:
        print(f"[DB DEBUG] Created temporary guest: {guest_name}")
        return user
    return None

def create_user(name: str, email: str, password: str, phone: str = None, role: str = "user") -> Optional[Dict]:
    """Create a new user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO users (name, email, password, phone, role)
            VALUES (?, ?, ?, ?, ?)
        """, (name, email, password, phone, role))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        return {
            "id": user_id,
            "name": name,
            "email": email,
            "phone": phone,
            "role": role
        }
    except sqlite3.IntegrityError:
        conn.close()
        return None  # Email already exists

def ban_user(user_id: int, days: int, reason: str) -> bool:
    """Ban a user for specified days"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    if user_id == 1:
        print("[AUTH] Cannot ban Super Admin (ID 1)")
        return False
        
    banned_until = (datetime.now() + timedelta(days=days)).isoformat()
    
    cursor.execute("""
        UPDATE users 
        SET banned_until = ?, ban_reason = ?
        WHERE id = ?
    """, (banned_until, reason, user_id))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def unban_user(user_id: int) -> bool:
    """Unban a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET banned_until = NULL, ban_reason = NULL
        WHERE id = ?
    """, (user_id,))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def delete_user(user_id: int) -> bool:
    """Delete a user and all their data"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    if user_id == 1:
        print("[AUTH] Cannot delete Super Admin (ID 1)")
        return False
        
    # Delete user's medicines and appointments first
    cursor.execute("DELETE FROM medicines WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM appointments WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM vitals WHERE user_id = ?", (user_id,))
    
    # Delete the user
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def update_admin_credentials(user_id: int, email: str, password: str) -> bool:
    """Update administrative credentials"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET email = ?, password = ?
        WHERE id = ? AND role IN ('admin', 'super_admin')
    """, (email, password, user_id))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def create_admin(name: str, email: str, password: str) -> Optional[Dict]:
    """Helper to create a new admin user"""
    return create_user(name, email, password, role="admin")

def update_user_language(user_id: int, language: str) -> bool:
    """Update user's preferred language"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET preferred_language = ?
        WHERE id = ?
    """, (language, user_id))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

# --- ADVANCED ADMIN SUITE HELPERS ---

def get_content(content_type: str = None) -> List[Dict]:
    """Get all content, optionally filtered by type"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if content_type:
        cursor.execute("SELECT * FROM content WHERE type = ? ORDER BY created_at DESC", (content_type,))
    else:
        cursor.execute("SELECT * FROM content ORDER BY created_at DESC")
    
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

def add_content(title: str, body: str, content_type: str, author_id: int) -> Dict:
    """Add new CMS content"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO content (title, body, type, author_id)
        VALUES (?, ?, ?, ?)
    """, (title, body, content_type, author_id))
    content_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": content_id, "title": title, "type": content_type}

def update_content(content_id: int, title: str, body: str, status: str = 'published') -> bool:
    """Update existing content"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE content 
        SET title = ?, body = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (title, body, status, content_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def delete_content(content_id: int) -> bool:
    """Delete content"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM content WHERE id = ?", (content_id,))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def get_media() -> List[Dict]:
    """Get all media assets"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM media ORDER BY created_at DESC")
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

def add_media(filename: str, url: str, file_type: str, size: int, uploader_id: int) -> Dict:
    """Add media record"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO media (filename, url, file_type, size, uploader_id)
        VALUES (?, ?, ?, ?, ?)
    """, (filename, url, file_type, size, uploader_id))
    media_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": media_id, "filename": filename, "url": url}

def delete_media(media_id: int) -> bool:
    """Delete media record"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM media WHERE id = ?", (media_id,))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def add_audit_log(user_id: int, action: str, resource: str = None, details: str = None) -> None:
    """Record administrative action"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (?, ?, ?, ?)
    """, (user_id, action, resource, details))
    conn.commit()
    conn.close()

def get_audit_logs(limit: int = 100) -> List[Dict]:
    """Get chronological audit trail"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, u.name as user_name 
        FROM audit_logs a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.timestamp DESC LIMIT ?
    """, (limit,))
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

def get_site_settings() -> Dict:
    """Get site-wide configuration"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM site_settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        data['branding'] = json.loads(data['branding_json'] or '{}')
        data['config'] = json.loads(data['system_config_json'] or '{}')
        return data
    return {}

def update_site_settings(branding: Dict = None, config: Dict = None) -> bool:
    """Update site-wide configuration"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    if branding is not None:
        cursor.execute("UPDATE site_settings SET branding_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", (json.dumps(branding),))
    if config is not None:
        cursor.execute("UPDATE site_settings SET system_config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", (json.dumps(config),))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def get_admin_stats() -> Dict:
    """Get summarized statistics for admin overview"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM content")
    total_content = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM media")
    total_media = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM audit_logs")
    total_logs = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "total_users": total_users,
        "total_content": total_content,
        "total_media": total_media,
        "total_logs": total_logs,
        "uptime": "99.98%", # Simulated for now
        "storage_used": "1.2 GB" # Simulated for now
    }

def get_admin_analytics(days: int = 30) -> Dict:
    """Get real growth analytics from user registration dates"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    labels = []
    values = []
    now = datetime.now()
    
    for i in range(days - 1, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        label = day.strftime("%b %d")
        
        # Count signups for this specific day (handle SQLite string dates)
        cursor.execute("SELECT COUNT(*) FROM users WHERE date(created_at) = ?", (day_str,))
        count = cursor.fetchone()[0]
        
        labels.append(label)
        values.append(count)
        
    conn.close()
    
    return {
        "labels": labels,
        "values": values
    }

def clear_system_data() -> bool:
    """Wipe all system data except admin users for a fresh demo restart"""
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        # Tables to wipe completely
        tables = [
            "vitals", "medicines", "appointments", "medicine_history", 
            "chat_messages", "audit_logs", "channel_whitelist", "reports", 
            "dm_messages", "dm_blocks", "channel_roles", "user_locations"
        ]
        
        for table in tables:
            try: cursor.execute(f"DELETE FROM {table}")
            except: pass
            
        # Delete non-admin users
        cursor.execute("DELETE FROM users WHERE role NOT IN ('admin', 'staff')")
        
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB ERROR] Clear system data failed: {e}")
        return False
    finally:
        conn.close()

def get_admin_tasks() -> List[Dict]:
    """Get summary of pending administrative actions"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # Check pending reports
    cursor.execute("SELECT COUNT(*) FROM reports WHERE status = 'pending'")
    pending_reports = cursor.fetchone()[0]
    
    # Check banned users
    cursor.execute("SELECT COUNT(*) FROM users WHERE banned_until IS NOT NULL")
    banned_users = cursor.fetchone()[0]
    
    # Check audit log density (simulated task if high)
    cursor.execute("SELECT COUNT(*) FROM audit_logs WHERE timestamp > datetime('now', '-24 hours')")
    recent_logs = cursor.fetchone()[0]
    
    conn.close()
    
    all_tasks = [
        {"label": "Pending Reports", "count": pending_reports, "highlight": pending_reports > 0},
        {"label": "Banned Users", "count": banned_users, "highlight": False},
        {"label": "Security Audits", "count": recent_logs, "highlight": recent_logs > 100}
    ]
    
    # Filter out empty tasks to avoid "dummy" data feeling
    active_tasks = [t for t in all_tasks if t['count'] > 0]
    
    return {
        "tasks": active_tasks
    }

# --- END ADMIN SUITE HELPERS ---

# Initialize admin user if not exists
def init_admin_user():
    """Create permanent admin user"""
    admin_email = "admin@elderlyguardian.com"
    admin_password = "password"
    
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # Check if admin user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
    if not cursor.fetchone():
        # Create admin user
        cursor.execute("""
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, ?)
        """, ("Administrator", admin_email, admin_password, "admin"))
        print("Admin user created successfully")
    else:
        # Force update password for existing admin to ensure access
        cursor.execute("UPDATE users SET password = ? WHERE email = ?", (admin_password, admin_email))
        conn.commit()
        print("Admin user already exists - Password updated")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_locations (
            user_id INTEGER PRIMARY KEY,
            latitude REAL,
            longitude REAL,
            updated_at TEXT,
            status TEXT DEFAULT 'active'
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize database with admin user
init_admin_user()

# --- ADMIN PROFILE HELPERS ---

def update_user_credentials(user_id: int, email: str, password: str) -> bool:
    """Update user email and password"""
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET email = ?, password = ? WHERE id = ?", (email, password, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Error updating credentials: {e}")
        return False
    finally:
        conn.close()

# --- LOCATION TRACKING HELPERS moved or removed ---

# --- Location tracking unified above ---

# --- COMMUNITY CHAT HELPERS ---

def add_chat_message(user_id: int, message: str) -> Dict:
    """Add a new message to the global chat"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO chat_messages (user_id, message)
        VALUES (?, ?)
    """, (user_id, message))
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": msg_id, "user_id": user_id, "message": message, "timestamp": datetime.now().isoformat()}

def get_chat_history(days: int = 30) -> List[Dict]:
    """Fetch chat history for the last N days"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Prune old messages before fetching as requested "history is for 30 days"
    cursor.execute("DELETE FROM chat_messages WHERE timestamp < datetime('now', ?)", (f'-{days} days',))
    conn.commit()

    cursor.execute("""
        SELECT c.*, u.name as user_name 
        FROM chat_messages c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.timestamp ASC
    """)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

# =====================
# DIRECT MESSAGE (DM) FUNCTIONS
# =====================

def get_dm_conversations(user_id: int) -> List[Dict]:
    """Get all users the current user has DM conversations with"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT 
            CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
            MAX(timestamp) as last_message_at
        FROM dm_messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY other_user_id
        ORDER BY last_message_at DESC
    """, (user_id, user_id, user_id))
    
    conversations = []
    for row in cursor.fetchall():
        other_id = row['other_user_id']
        cursor.execute("SELECT id, name, role, avatar_url FROM users WHERE id = ?", (other_id,))
        user_row = cursor.fetchone()
        if user_row:
            cursor.execute("SELECT COUNT(*) FROM dm_messages WHERE sender_id = ? AND receiver_id = ? AND read = 0", (other_id, user_id))
            unread = cursor.fetchone()[0]
            cursor.execute("SELECT message FROM dm_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY timestamp DESC LIMIT 1", (user_id, other_id, other_id, user_id))
            last_msg = cursor.fetchone()
            conversations.append({
                "user_id": user_row['id'], "name": user_row['name'], "role": user_row['role'],
                "avatar_url": user_row['avatar_url'], "last_message_at": row['last_message_at'],
                "last_message": last_msg['message'][:50] if last_msg else None, "unread_count": unread
            })
    conn.close()
    return conversations

def get_dm_history(user_id: int, other_user_id: int, limit: int = 100) -> List[Dict]:
    """Get DM history between two users"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT dm.*, u.name as sender_name, u.avatar_url as sender_avatar
        FROM dm_messages dm LEFT JOIN users u ON dm.sender_id = u.id
        WHERE (dm.sender_id = ? AND dm.receiver_id = ?) OR (dm.sender_id = ? AND dm.receiver_id = ?)
        ORDER BY dm.timestamp ASC LIMIT ?
    """, (user_id, other_user_id, other_user_id, user_id, limit))
    messages = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return messages

def block_user_dm(user_id: int, blocked_id: int):
    """Block a user from sending DMs"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO dm_blocks (user_id, blocked_id) VALUES (?, ?)", (user_id, blocked_id))
    conn.commit()
    conn.close()

def unblock_user_dm(user_id: int, blocked_id: int):
    """Unblock a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM dm_blocks WHERE user_id = ? AND blocked_id = ?", (user_id, blocked_id))
    conn.commit()
    conn.close()

def is_dm_blocked(user_id: int, other_id: int) -> bool:
    """Check if either user has blocked the other"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM dm_blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)", 
                   (user_id, other_id, other_id, user_id))
    blocked = cursor.fetchone() is not None
    conn.close()
    return blocked

def get_blocked_users(user_id: int) -> List[int]:
    """Get list of users blocked by this user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT blocked_id FROM dm_blocks WHERE user_id = ?", (user_id,))
    blocked_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    return blocked_ids

def send_dm(sender_id: int, receiver_id: int, message: str, attachment_url: str = None, attachment_type: str = None) -> Dict:
    """Send a direct message"""
    if is_dm_blocked(sender_id, receiver_id):
        raise Exception("Messaging is blocked between these users.")
        
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO dm_messages (sender_id, receiver_id, message, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?)", 
                   (sender_id, receiver_id, message, attachment_url, attachment_type))
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": msg_id, "sender_id": sender_id, "receiver_id": receiver_id, "message": message, "attachment_url": attachment_url, "attachment_type": attachment_type}

def mark_dms_read(user_id: int, other_user_id: int) -> int:
    """Mark all DMs from other_user as read"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE dm_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0", (other_user_id, user_id))
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    return updated

def clear_dm_history(user_id: int, other_id: int):
    """Delete all messages between two users"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM dm_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)", 
                   (user_id, other_id, other_id, user_id))
    conn.commit()
    conn.close()

def update_dm_message(msg_id: int, message: str):
    """Update a DM message"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE dm_messages SET message = ? WHERE id = ?", (message, msg_id))
    conn.commit()
    conn.close()

def delete_dm_message(msg_id: int):
    """Delete a DM message"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE dm_messages SET is_deleted = 1 WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()

def delete_chat_message(msg_id: int):
    """Soft delete a chat message"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE chat_messages SET is_deleted = 1 WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()

# =====================
# CHANNEL ROLES FUNCTIONS
# =====================

def get_channel_roles(channel_id: str) -> List[Dict]:
    """Get all users with roles in a channel"""
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT cr.*, u.name as user_name, u.email as user_email
        FROM channel_roles cr
        LEFT JOIN users u ON cr.user_id = u.id
        WHERE cr.channel_id = ?
        ORDER BY CASE cr.role WHEN 'owner' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END
    """, (channel_id,))
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

def set_channel_role(channel_id: str, user_id: int, role: str) -> bool:
    """Assign a role to a user in a channel (owner, moderator, member)"""
    if role not in ['owner', 'moderator', 'member']:
        return False
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO channel_roles (channel_id, user_id, role) VALUES (?, ?, ?)
        ON CONFLICT(channel_id, user_id) DO UPDATE SET role = excluded.role
    """, (channel_id, user_id, role))
    conn.commit()
    conn.close()
    return True

def remove_channel_role(channel_id: str, user_id: int) -> bool:
    """Remove a user's role from a channel"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM channel_roles WHERE channel_id = ? AND user_id = ?", (channel_id, user_id))
    conn.commit()
    conn.close()
    return True

def get_user_channel_role(channel_id: str, user_id: int) -> Optional[str]:
    """Get a user's role in a specific channel"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM channel_roles WHERE channel_id = ? AND user_id = ?", (channel_id, user_id))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

def is_channel_moderator(channel_id: str, user_id: int) -> bool:
    """Check if user is owner or moderator of a channel"""
    role = get_user_channel_role(channel_id, user_id)
    return role in ['owner', 'moderator']

# --- Unified Channel & Chat Sync ---

def get_channels_with_meta():
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            c.id, c.name, c.type, c.is_protected, c.read_only, 
            (SELECT timestamp FROM chat_messages WHERE channel = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_at,
            (SELECT user_id FROM chat_messages WHERE channel = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_by
        FROM channels c
    """)
    raw = cursor.fetchall()
    channels = []
    for r in raw:
        cursor.execute("SELECT user_id FROM channel_whitelist WHERE channel_id = ?", (r[0],))
        wl = [row[0] for row in cursor.fetchall()]
        channels.append({
            "id": r[0], "name": r[1], "type": r[2], "is_protected": bool(r[3]), "read_only": bool(r[4]),
            "last_message_at": r[5], "last_message_by": r[6], "whitelisted_users": wl
        })
    conn.close()
    return channels

def create_channel(ch_id: str, name: str, read_only: bool = False):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO channels (id, name, type, is_protected, read_only) VALUES (?, ?, 'text', 0, ?)", (ch_id, name, int(read_only)))
    conn.commit()
    conn.close()
    return True

def update_channel(ch_id: str, name: str, read_only: bool):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE channels SET name = ?, read_only = ? WHERE id = ?", (name, int(read_only), ch_id))
    conn.commit()
    conn.close()
    return True

def delete_channel(ch_id: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM channels WHERE id = ?", (ch_id,))
    cursor.execute("DELETE FROM channel_whitelist WHERE channel_id = ?", (ch_id,))
    conn.commit()
    conn.close()
    return True

def clear_channel_messages(ch_id: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_messages WHERE channel = ?", (ch_id,))
    conn.commit()
    conn.close()
    return True

def add_channel_whitelist(ch_id: str, user_id: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO channel_whitelist (channel_id, user_id) VALUES (?, ?)", (ch_id, user_id))
        conn.commit()
        return True
    except: return False
    finally: conn.close()

def remove_channel_whitelist(ch_id: str, user_id: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM channel_whitelist WHERE channel_id = ? AND user_id = ?", (ch_id, user_id))
    conn.commit()
    conn.close()
    return True

def get_chat_history(channel: str = "general", limit: int = 50):
    conn = db.get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT cm.*, u.name as user_name
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.channel = ?
        ORDER BY cm.timestamp ASC LIMIT ?
    """, (channel, limit))
    res = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return res

def add_chat_message(user_id: int, message: str, channel: str = "general", reply_to_id: int = None, attachment_url: str = None, attachment_type: str = None):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO chat_messages (user_id, message, channel, reply_to_id, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?)", 
                   (user_id, message, channel, reply_to_id, attachment_url, attachment_type))
    conn.commit()
    conn.close()
    return True

def log_audit(user_id: int, action: str, details: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", (user_id, action, details))
    conn.commit()
    conn.close()

def get_audit_logs_list(limit: int = 100):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.user_id, u.name, a.action, a.details, a.timestamp 
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.timestamp DESC LIMIT ?
    """, (limit,))
    logs = []
    for r in cursor.fetchall():
        logs.append({"id": r[0], "user_id": r[1], "user_name": r[2] or "Unknown", "action": r[3], "details": r[4], "timestamp": r[5]})
    conn.close()
    return logs

def update_user_role(user_id: int, role: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
    conn.commit()
    conn.close()
    return True

def update_user_avatar(user_id: int, avatar_url: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user_id))
    conn.commit()
    conn.close()
    return True

def create_report(reporter_id: int, reported_id: int, content_id: int, reason: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (reporter_id, reported_user_id, content_id, reason)
        VALUES (?, ?, ?, ?)
    """, (reporter_id, reported_id, content_id, reason))
    conn.commit()
    conn.close()
    return True

def get_reports_list():
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id, r.reporter_id, u1.name as reporter_name, 
               r.reported_user_id, u2.name as reported_name, 
               r.content_id, r.reason, r.status, r.created_at
        FROM reports r
        LEFT JOIN users u1 ON r.reporter_id = u1.id
        LEFT JOIN users u2 ON r.reported_user_id = u2.id
        ORDER BY r.created_at DESC
    """)
    reports = []
    for row in cursor.fetchall():
        reports.append({
            "id": row[0], "reporter_id": row[1], "reporter_name": row[2] or "Unknown",
            "reported_id": row[3], "reported_name": row[4] or "Unknown",
            "content_id": row[5], "reason": row[6], "status": row[7], "timestamp": row[8]
        })
    conn.close()
    return reports

def update_report_status(report_id: int, status: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE reports SET status = ? WHERE id = ?", (status, report_id))
    conn.commit()
    conn.close()
    return True

def delete_report(report_id: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reports WHERE id = ?", (report_id,))
    conn.commit()
    conn.close()
    return True

def get_dm_message(msg_id: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT sender_id, timestamp, message FROM dm_messages WHERE id = ?", (msg_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"sender_id": row[0], "timestamp": row[1], "message": row[2]}
    return None

def ban_user_hard(user_id: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET banned_until = 'forever' WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

def get_all_users_with_bans(channel_id: str = None):
    conn = db.get_connection()
    cursor = conn.cursor()
    if channel_id:
        cursor.execute("""
            SELECT u.id, u.name, u.role, u.banned_until, u.ban_reason, u.avatar_url, b.reason as channel_ban_reason
            FROM users u
            LEFT JOIN channel_bans b ON u.id = b.user_id AND b.channel_id = ?
        """, (channel_id,))
        users = [{"id": r[0], "name": r[1], "role": r[2], "banned_until": r[3], "ban_reason": r[4], "avatar_url": r[5], "is_banned_in_channel": r[6] is not None, "channel_ban_reason": r[6]} for r in cursor.fetchall()]
    else:
        cursor.execute("SELECT id, name, role, banned_until, ban_reason, avatar_url FROM users")
        users = [{"id": r[0], "name": r[1], "role": r[2], "banned_until": r[3], "ban_reason": r[4], "avatar_url": r[5]} for r in cursor.fetchall()]
    conn.close()
    return users

def get_admin_users_list():
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, role, banned_until, created_at FROM users")
    users = []
    for r in cursor.fetchall():
        users.append({
            "id": r[0], "name": r[1], "email": r[2], "phone": r[3], "role": r[4], "banned_until": r[5], "created_at": r[6]
        })
    conn.close()
    return users

def ban_user_globally(user_id: int, reason: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET banned_until = 'forever', ban_reason = ? WHERE id = ?", (reason, user_id))
    conn.commit()
    conn.close()
    return True

def ban_user_from_channel(user_id: int, channel_id: str, reason: str, banned_by: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO channel_bans (user_id, channel_id, reason, banned_by) VALUES (?, ?, ?, ?)",
                   (user_id, channel_id, reason, banned_by))
    conn.commit()
    conn.close()
    return True

def unban_user_from_channel(user_id: int, channel_id: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM channel_bans WHERE user_id = ? AND channel_id = ?", (user_id, channel_id))
    conn.commit()
    conn.close()
    return True

def get_channel_bans_list(channel_id: str):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT b.user_id, u.name, b.reason, b.timestamp 
        FROM channel_bans b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.channel_id = ?
    """, (channel_id,))
    bans = []
    for r in cursor.fetchall():
        bans.append({"user_id": r[0], "user_name": r[1], "reason": r[2], "timestamp": r[3]})
    conn.close()
    return bans

def get_user_channel_bans_dict(user_id: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT channel_id, reason FROM channel_bans WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return {r[0]: r[1] for r in rows}

def get_chat_message_data(msg_id: int):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, timestamp, channel FROM chat_messages WHERE id = ?", (msg_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"user_id": row[0], "timestamp": row[1], "channel": row[2]}
    return None

def delete_vitals(vitals_id: int) -> bool:
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM vitals WHERE id = ?", (vitals_id,))
        conn.commit()
        return True
    except:
        return False
    finally:
        conn.close()

def update_vitals(vitals_id: int, bp_systolic: int, bp_diastolic: int, sugar_level: int, heart_rate: int, notes: str) -> bool:
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE vitals 
            SET bp_systolic = ?, bp_diastolic = ?, sugar_level = ?, heart_rate = ?, notes = ? 
            WHERE id = ?
        """, (bp_systolic, bp_diastolic, sugar_level, heart_rate, notes, vitals_id))
        conn.commit()
        return True
    except:
        return False
    finally:
        conn.close()

def update_user_location(user_id: int, lat: float, lng: float) -> bool:
    """Update user's current coordinates in SQLite - Using REPLACE for maximum compatibility"""
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now().isoformat()
        # Using INSERT OR REPLACE to avoid issues with older SQLite versions not supporting ON CONFLICT
        cursor.execute("""
            INSERT OR REPLACE INTO user_locations (user_id, latitude, longitude, status, updated_at)
            VALUES (?, ?, ?, 'active', ?)
        """, (user_id, lat, lng, now))
        conn.commit()
        return True
    except Exception as e:
        print(f"[SQLite] Location Update Error: {e}")
        return False
    finally:
        conn.close()

def get_latest_vitals(user_id: int):
    """Get the most recent vitals for a user"""
    conn = db.get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT bp_systolic, bp_diastolic, sugar_level, heart_rate, recorded_at 
            FROM vitals 
            WHERE user_id = ? 
            ORDER BY recorded_at DESC LIMIT 1
        """, (user_id,))
        row = cursor.fetchone()
        
        if row:
            return {
                "bp": {"systolic": row[0], "diastolic": row[1]},
                "sugar": {"level": row[2]},
                "heart_rate": {"bpm": row[3]},
                "last_checked": row[4]
            }
        return None
    except Exception as e:
        print(f"[DB Error] get_latest_vitals: {e}")
        return None
    finally:
        conn.close()

def get_appointments(user_id: int, status='pending'):
    """Get upcoming appointments"""
    conn = db.get_connection()
    try:
        cursor = conn.cursor()
        # Simple check for future appointments
        now = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT doctor_name, date, time, reason 
            FROM appointments 
            WHERE user_id = ? AND date >= ?
            ORDER BY date ASC LIMIT 3
        """, (user_id, now))
        
        apps = []
        for r in cursor.fetchall():
            apps.append({"doctor": r[0], "date": r[1], "time": r[2], "reason": r[3]})
        return apps
    except Exception as e:
        print(f"[DB Error] get_appointments: {e}")
        return []
    finally:
        conn.close()

def get_user_context(user_id: int):
    """Aggregate all health context for AI"""
    return {
        "medicines": get_medicines(user_id),
        "vitals": get_latest_vitals(user_id),
        "appointments": get_appointments(user_id)
    }
