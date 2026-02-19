import sqlite3
import os

DB_PATH = "elderly_guardian.db"

def debug_reports():
    print(f"📂 Checking Database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("❌ Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Check Table Existence
    print("\n--- 1. Checking Table Existence ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reported_users'")
    if not cursor.fetchone():
        print("❌ Table 'reported_users' MISSING!")
    else:
        print("✅ Table 'reported_users' exists.")

    # 2. Check Raw Data
    print("\n--- 2. Checking Raw Data in 'reported_users' ---")
    cursor.execute("SELECT * FROM reported_users")
    rows = cursor.fetchall()
    print(f"Found {len(rows)} raw rows.")
    for row in rows:
        print(row)

    # 3. Check JOIN Query
    print("\n--- 3. Checking JOIN Query (API Logic) ---")
    try:
        cursor.execute("""
            SELECT r.id, r.reporter_id, u1.name as reporter_name, 
                   r.reported_id, u2.name as reported_name, 
                   r.channel_id, c.name as channel_name, 
                   r.reason, r.timestamp
            FROM reported_users r
            LEFT JOIN users u1 ON r.reporter_id = u1.id
            LEFT JOIN users u2 ON r.reported_id = u2.id
            LEFT JOIN channels c ON r.channel_id = c.id
            ORDER BY r.timestamp DESC
        """)
        results = cursor.fetchall()
        print(f"Found {len(results)} JOIN results.")
        for res in results:
            print(res)
    except Exception as e:
        print(f"❌ Query Error: {e}")

    conn.close()

if __name__ == "__main__":
    debug_reports()
