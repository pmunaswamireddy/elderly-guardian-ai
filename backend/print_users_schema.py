import sqlite3
conn = sqlite3.connect('backend/elderly_guardian.db')
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
print(cursor.fetchone()[0])
conn.close()
