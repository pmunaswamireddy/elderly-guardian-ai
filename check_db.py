import sqlite3
import os

db_path = "backend/elderly_guardian.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- chat_messages schema ---")
    cursor.execute("PRAGMA table_info(chat_messages)")
    cols = cursor.fetchall()
    for col in cols:
        print(col)
        
    print("\n--- dm_messages schema ---")
    cursor.execute("PRAGMA table_info(dm_messages)")
    cols = cursor.fetchall()
    for col in cols:
        print(col)
        
    cursor.execute("SELECT is_deleted FROM chat_messages LIMIT 5")
    rows = cursor.fetchall()
    print("\n--- chat_messages is_deleted sample ---")
    print(rows)
    
    conn.close()
else:
    print(f"{db_path} not found")
