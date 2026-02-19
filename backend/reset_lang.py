import sqlite3

DB_PATH = "elderly_guardian.db"

def reset_ai_language():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Resetting AI language for all users to 'en'...")
    cursor.execute("UPDATE users SET ai_language = 'en'")
    conn.commit()
    
    # Verify
    cursor.execute("SELECT id, name, preferred_language, ai_language FROM users")
    for row in cursor.fetchall():
        print(f"ID: {row[0]} | Name: {row[1]} | Pref: {row[2]} | AI: {row[3]}")
        
    conn.close()

if __name__ == "__main__":
    reset_ai_language()
