import sqlite3
import json

def get_schema():
    conn = sqlite3.connect('backend/elderly_guardian.db')
    cursor = conn.cursor()
    
    tables = [
        "users", "channels", "medicines", "medicine_history", 
        "vitals", "appointments", "chat_messages", 
        "dm_messages", "dm_blocks", "channel_roles", 
        "user_locations", "audit_logs"
    ]
    
    schema = {}
    for table in tables:
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]
            schema[table] = columns
        except Exception as e:
            schema[table] = str(e)
            
    conn.close()
    with open('backend/sqlite_schema_dump.json', 'w') as f:
        json.dump(schema, f, indent=4)
    print("Schema dumped to backend/sqlite_schema_dump.json")

if __name__ == "__main__":
    get_schema()
