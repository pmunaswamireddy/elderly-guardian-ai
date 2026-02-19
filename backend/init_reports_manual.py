import sqlite3
import os

DB_PATH = "elderly_guardian.db"

def init_reports_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print("Creating reported_users table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reported_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER,
            reported_id INTEGER,
            channel_id INTEGER,
            reason TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    print("✅ Table created successfully.")
    conn.close()

if __name__ == "__main__":
    init_reports_table()
