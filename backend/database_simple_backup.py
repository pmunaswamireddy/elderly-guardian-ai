import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Any

# Simple SQLite Database - Lightweight Alternative to SQLAlchemy
class SimpleDB:
    def __init__(self, db_path: str = "elderly_guardian.db"):
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def init_database(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Create users table with admin and ban functionality
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                password TEXT DEFAULT 'password',
                phone TEXT,
                role TEXT DEFAULT 'user',
                banned_until TEXT,
                ban_reason TEXT,
                preferred_language TEXT DEFAULT 'en',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create medicines table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS medicines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                time TEXT NOT NULL,
                after_meal INTEGER DEFAULT 0,
                taken INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create appointments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                doctor_name TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create vitals table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vitals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                bp_systolic INTEGER NOT NULL,
                bp_diastolic INTEGER NOT NULL,
                sugar_level INTEGER NOT NULL,
                heart_rate INTEGER NOT NULL,
                notes TEXT,
                recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def init_default_data(self):
        """Initialize with default user and sample data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if users exist
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        if user_count == 0:
            # Create default user
            cursor.execute('''
                INSERT INTO users (name, email, password, phone) 
                VALUES (?, ?, ?, ?)
            ''', ("Default User", "user@elderlyguardian.com", "password", "123-456-7890"))
            
            user_id = cursor.lastrowid
            
            # Add default medicines
            medicines = [
                ("Aspirin", "100mg", "18:00", 1, 0),
                ("Metformin", "500mg", "08:00", 1, 1),
                ("Atorvastatin", "20mg", "21:00", 0, 0)
            ]
            
            for med in medicines:
                cursor.execute('''
                    INSERT INTO medicines (user_id, name, dosage, time, after_meal, taken)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_id, *med))
            
            # Add default appointments
            appointments = [
                ("Dr. Smith", "2024-12-27", "10:30", "Routine Checkup"),
                ("Dr. Johnson", "2024-12-30", "14:00", "Follow-up")
            ]
            
            for apt in appointments:
                cursor.execute('''
                    INSERT INTO appointments (user_id, doctor_name, date, time, reason)
                    VALUES (?, ?, ?, ?, ?)
                ''', (user_id, *apt))
            
            # Add default vitals
            cursor.execute('''
                INSERT INTO vitals (user_id, bp_systolic, bp_diastolic, sugar_level, heart_rate, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, 118, 79, 95, 72, "Initial health baseline"))
            
            conn.commit()
            print("Default user and data initialized in SQLite database")
        else:
            print("SQLite database already contains data")
        
        conn.close()

# Database instance
db = SimpleDB()

# Initialize default data
db.init_default_data()

# Helper functions for FastAPI endpoints
# User authentication functions
def create_user(name: str, email: str, password: str, phone: str = "") -> Dict:
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (name, email, password, phone)
            VALUES (?, ?, ?, ?)
        ''', (name, email, password, phone))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": user_id, "name": name, "email": email}
    except sqlite3.IntegrityError:
        conn.close()
        return None

def authenticate_user(name_or_email: str, password: str) -> Optional[Dict]:
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, name, email FROM users
        WHERE (name = ? OR email = ?) AND password = ?
    ''', (name_or_email, name_or_email, password))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "name": row[1], "email": row[2]}
    return None

# User-aware data functions
def get_medicines(user_id: int) -> List[Dict]:
    """Get all medicines for a specific user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, name, dosage, time, after_meal, taken 
        FROM medicines 
        WHERE user_id = ?
    ''', (user_id,))
    
    medicines = []
    for row in cursor.fetchall():
        medicines.append({
            "id": row[0],
            "name": row[1],
            "dosage": row[2],
            "time": row[3],
            "after_meal": bool(row[4]),
            "taken": bool(row[5])
        })
    
    conn.close()
    return medicines

def add_medicine(user_id: int, name: str, dosage: str, time: str, after_meal: bool) -> Dict:
    """Add a new medicine for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO medicines (user_id, name, dosage, time, after_meal, taken)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (user_id, name, dosage, time, int(after_meal)))
    
    medicine_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": medicine_id,
        "name": name,
        "dosage": dosage,
        "time": time,
        "after_meal": after_meal,
        "taken": False
    }

def update_medicine(medicine_id: int, taken: bool) -> bool:
    """Update medicine taken status"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE medicines 
        SET taken = ? 
        WHERE id = ?
    ''', (int(taken), medicine_id))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def get_appointments(user_id: int) -> List[Dict]:
    """Get all appointments for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, doctor_name, date, time, reason 
        FROM appointments 
        WHERE user_id = ?
        ORDER BY date, time
    ''', (user_id,))

    appointments = []
    for row in cursor.fetchall():
        appointments.append({
            "id": row[0],
            "doctor_name": row[1],
            "date": row[2],
            "time": row[3],
            "reason": row[4]
        })

    conn.close()
    return appointments

def add_appointment(user_id: int, doctor_name: str, date: str, time: str, reason: str) -> Dict:
    """Add a new appointment for a user"""
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO appointments (user_id, doctor_name, date, time, reason)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, doctor_name, date, time, reason))

    appointment_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": appointment_id,
        "doctor_name": doctor_name,
        "date": date,
        "time": time,
        "reason": reason
    }

def save_vitals(user_id: int, bp_systolic: int, bp_diastolic: int, sugar_level: int, heart_rate: int, notes: str = ""):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO vitals (user_id, bp_systolic, bp_diastolic, sugar_level, heart_rate, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, bp_systolic, bp_diastolic, sugar_level, heart_rate, notes))
    conn.commit()
    conn.close()

def get_latest_vitals(user_id: int) -> Optional[Dict]:
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT bp_systolic, bp_diastolic, sugar_level, heart_rate, recorded_at
        FROM vitals
        WHERE user_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1
    ''', (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "bp": {"systolic": row[0], "diastolic": row[1], "last_checked": row[4]},

def get_untaken_medicines_count(user_id: int = 1) -> int:
"""Get count of untaken medicines for a user"""
conn = db.get_connection()
cursor = conn.cursor()

cursor.execute('''
    SELECT COUNT(*) 
    FROM medicines 
    WHERE user_id = ? AND taken = 0
''', (user_id,))

count = cursor.fetchone()[0]
conn.close()
return count

# Initialize admin user if not exists
def init_admin_user():
"""Create permanent admin user"""
admin_email = "admin@elderlyguardian.com"
admin_password = "admin123"

conn = db.get_connection()
cursor = conn.cursor()

# Check if admin user exists
cursor.execute('SELECT id FROM users WHERE email = ?', (admin_email,))
if not cursor.fetchone():
    # Create admin user
    cursor.execute('''
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
    ''', ("Administrator", admin_email, admin_password, "admin"))
    print("Admin user created successfully")
else:
    print("Admin user already exists")

conn.commit()
conn.close()

# Initialize database with admin user
db.init_database()
init_admin_user()

if __name__ == "__main__":
    # Test database functions
    print("Testing SQLite Database...")

    medicines = get_medicines()
    print(f"Found {len(medicines)} medicines")

    
    appointments = get_appointments()
    print(f"Found {len(appointments)} appointments")
    
    untaken = get_untaken_medicines_count()
    print(f"{untaken} medicines remaining today")
    
    print("Database test completed successfully!")
