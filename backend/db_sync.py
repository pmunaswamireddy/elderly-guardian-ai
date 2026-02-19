import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Callable
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "elderly_guardian.db")

# Core Tables to Sync
SYNC_TABLES = [
    "users", "channels", "medicines", "medicine_history", 
    "vitals", "appointments", "chat_messages", 
    "dm_messages", "dm_blocks", "channel_roles", 
    "user_locations", "audit_logs", "content", 
    "media", "reports", "channel_whitelist", "channel_bans"
]

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase credentials not configured.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_sqlite_conn():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def cast_to_postgres(record: Dict[str, Any]) -> Dict[str, Any]:
    """Convert SQLite types to Postgres-friendly types (mostly booleans)"""
    new_record = record.copy()
    boolean_fields = [
        "voice_enabled", "ai_enabled", "voice_reminders_enabled", 
        "ai_always_active", "after_meal", "taken", "is_protected", 
        "read_only", "is_deleted", "read"
    ]
    for key, val in new_record.items():
        if key in boolean_fields and val is not None:
            new_record[key] = bool(val)
        # Handle empty strings to None for foreign keys if necessary
        if val == "" and key.endswith("_id"):
            new_record[key] = None
    return new_record

def cast_to_sqlite(record: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Postgres/JSON types to SQLite-friendly types"""
    new_record = record.copy()
    for key, val in new_record.items():
        if isinstance(val, bool):
            new_record[key] = 1 if val else 0
        if isinstance(val, (dict, list)): # Handle JSONB fields
            import json
            new_record[key] = json.dumps(val)
    return new_record

def sync_local_to_cloud(on_progress: Callable[[str, float], None] = None):
    """Push local SQLite data to Supabase"""
    supabase = get_supabase_client()
    local_conn = get_sqlite_conn()
    cursor = local_conn.cursor()
    
    # Get actual SQLite tables to skip missing ones
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    sqlite_tables = {r[0] for r in cursor.fetchall()}
    
    total_tables = len(SYNC_TABLES)
    errors = []
    
    try:
        for i, table in enumerate(SYNC_TABLES):
            if table not in sqlite_tables:
                print(f"[Sync] Skipping '{table}' – not in SQLite")
                continue

            if on_progress: on_progress(f"Reading {table}...", (i / total_tables))
            
            try:
                cursor.execute(f"SELECT * FROM {table}")
                rows = [dict(r) for r in cursor.fetchall()]
                
                if not rows:
                    continue
                    
                formatted_rows = [cast_to_postgres(r) for r in rows]
                
                if on_progress: on_progress(f"Uploading {len(rows)} rows to {table}...", ((i + 0.5) / total_tables))
                
                chunk_size = 100
                excluded_cols: set = set()
                for j in range(0, len(formatted_rows), chunk_size):
                    chunk = formatted_rows[j:j+chunk_size]
                    while True:
                        try:
                            filtered = [{k: v for k, v in r.items() if k not in excluded_cols} for r in chunk]
                            supabase.table(table).upsert(filtered).execute()
                            break
                        except Exception as col_err:
                            err_str = str(col_err)
                            # Detect schema column mismatch and strip the offending column
                            if "PGRST204" in err_str or "column" in err_str.lower():
                                import re
                                match = re.search(r"'(\w+)' column of '(\w+)'", err_str)
                                if match:
                                    bad_col = match.group(1)
                                    excluded_cols.add(bad_col)
                                    print(f"[Sync] '{table}': stripping unknown column '{bad_col}' and retrying")
                                    continue
                            raise  # Not a column error, escalate

            except Exception as table_err:
                print(f"[Sync] Skipping '{table}' – error: {table_err}")
                errors.append(f"{table}: {table_err}")
                
        if on_progress: on_progress("Sync Complete (Local -> Cloud)", 1.0)
        return True
    except Exception as e:
        print(f"Sync Error (Push): {e}")
        if on_progress: on_progress(f"Error: {str(e)}", 0)
        return False
    finally:
        local_conn.close()

def sync_cloud_to_local(on_progress: Callable[[str, float], None] = None):
    """Pull Supabase data to local SQLite"""
    supabase = get_supabase_client()
    local_conn = get_sqlite_conn()
    cursor = local_conn.cursor()
    
    # Get actual SQLite tables to skip missing ones
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    sqlite_tables = {r[0] for r in cursor.fetchall()}

    total_tables = len(SYNC_TABLES)
    
    try:
        cursor.execute("PRAGMA foreign_keys = OFF")
        
        for i, table in enumerate(SYNC_TABLES):
            if table not in sqlite_tables:
                print(f"[Sync] Skipping '{table}' – not in SQLite")
                continue

            if on_progress: on_progress(f"Fetching {table} from cloud...", (i / total_tables))
            
            try:
                res = supabase.table(table).select("*").execute()
                rows = res.data
                
                if not rows:
                    continue
                    
                if on_progress: on_progress(f"Saving {len(rows)} rows to {table} locally...", ((i + 0.5) / total_tables))
                
                cursor.execute(f"DELETE FROM {table}")
                
                for row in rows:
                    sqlite_row = cast_to_sqlite(row)
                    cols = ", ".join(sqlite_row.keys())
                    placeholders = ", ".join(["?" for _ in sqlite_row])
                    sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"
                    cursor.execute(sql, list(sqlite_row.values()))
                
                local_conn.commit()
            except Exception as table_err:
                print(f"[Sync] Skipping '{table}' – error: {table_err}")
            
        cursor.execute("PRAGMA foreign_keys = ON")
        if on_progress: on_progress("Sync Complete (Cloud -> Local)", 1.0)
        return True
    except Exception as e:
        print(f"Sync Error (Pull): {e}")
        if on_progress: on_progress(f"Error: {str(e)}", 0)
        return False
    finally:
        local_conn.close()

if __name__ == "__main__":
    def log(msg, p): print(f"[{int(p*100)}%] {msg}")
    print("Test Push...")
    sync_local_to_cloud(log)
