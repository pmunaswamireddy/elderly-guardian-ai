import sqlite3
import os

DB_PATH = "elderly_guardian.db" # Verified from database_simple.py

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {os.path.abspath(DB_PATH)}")
        # Try parent? No, we will run this from backend folder
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Checking for missing columns...")
    
    # Columns to ensure exist
    cols_to_add = [
        ("ai_language", "TEXT DEFAULT 'en'"),
        ("ai_voice_pitch", "REAL DEFAULT 1.0"),
        ("ai_voice_rate", "REAL DEFAULT 1.0"), 
        ("ai_voice_clarity", "REAL DEFAULT 1.0"),
        ("ai_voice_model", "TEXT DEFAULT 'edge-neural'"),
        ("preferred_language", "TEXT DEFAULT 'en'"), # Ensure this exists too
        ("voice_enabled", "INTEGER DEFAULT 1"),
        ("ai_always_active", "INTEGER DEFAULT 1")
    ]
    
    cursor.execute("PRAGMA table_info(users)")
    existing = [col[1] for col in cursor.fetchall()]
    
    for col_name, col_type in cols_to_add:
        if col_name not in existing:
            print(f"Adding column: {col_name}")
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"  > Success")
            except Exception as e:
                print(f"  > Failed: {e}")
        else:
            print(f"Exists: {col_name}")
            
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    run_migration()
