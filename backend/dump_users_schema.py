import sqlite3
conn = sqlite3.connect('backend/elderly_guardian.db')
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
with open('backend/users_schema.txt', 'w') as f:
    f.write(cursor.fetchone()[0])
conn.close()
