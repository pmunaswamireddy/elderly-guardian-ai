import os
from database_simple import SimpleDB
db = SimpleDB()
conn = db.get_connection()
cursor = conn.cursor()
cursor.execute("INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@elderlyguardian.com', 'password', 'super_admin') ON CONFLICT(email) DO UPDATE SET role='super_admin', password='password'")
print('ADMIN CREATED SUCCESS')
