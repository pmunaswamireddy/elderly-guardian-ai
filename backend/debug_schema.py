import sqlite3

def check_schema():
    conn = sqlite3.connect("elderly_guardian.db")
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(user_locations)")
    cols = cursor.fetchall()
    for col in cols:
        print(col)
    conn.close()

if __name__ == "__main__":
    check_schema()
