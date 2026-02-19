import sqlite3
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# CONFIG (User must provide these)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") # Service role key

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
sqlite_conn = sqlite3.connect("backend/elderly_guardian.db")
cursor = sqlite_conn.cursor()

def migrate_table(table_name: str):
    print(f"Migrating {table_name}...")
    cursor.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    data = []
    for row in rows:
        record = dict(zip(columns, row))
        # SQLite uses 0/1 for booleans, Postgres likes True/False
        for key, val in record.items():
            is_bool = any(k in key for k in ["enabled", "active", "read", "deleted", "taken", "after_meal", "protected"])
            if val == 0 and is_bool:
                record[key] = False
            elif val == 1 and is_bool:
                record[key] = True
        data.append(record)
    
    if data:
        res = supabase.table(table_name).upsert(data).execute()
        print(f"✅ Migrated {len(data)} rows to {table_name}")
    else:
        print(f"ℹ️ {table_name} is empty, skipping.")

def run_migration():
    tables = [
        "users", "channels", "medicines", "medicine_history", 
        "vitals", "appointments", "chat_messages", 
        "dm_messages", "dm_blocks", "channel_roles", 
        "user_locations", "audit_logs"
    ]
    
    for table in tables:
        try:
            migrate_table(table)
        except Exception as e:
            print(f"❌ Error migrating {table}: {e}")

if __name__ == "__main__":
    run_migration()
    sqlite_conn.close()
