from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# SQLite Database Setup
DATABASE_URL = "sqlite:///./elderly_guardian.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    medicines = relationship("Medicine", back_populates="user")
    appointments = relationship("Appointment", back_populates="user")
    vitals = relationship("Vitals", back_populates="user")

class Medicine(Base):
    __tablename__ = "medicines"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    time = Column(String, nullable=False)
    after_meal = Column(Boolean, default=False)
    taken = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="medicines")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    doctor_name = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="appointments")

class Vitals(Base):
    __tablename__ = "vitals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    bp_systolic = Column(Integer, nullable=False)
    bp_diastolic = Column(Integer, nullable=False)
    sugar_level = Column(Integer, nullable=False)
    heart_rate = Column(Integer, nullable=False)
    notes = Column(Text)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="vitals")

# Create all tables
Base.metadata.create_all(bind=engine)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize with default user if no users exist
def init_default_data():
    db = SessionLocal()
    try:
        # Check if users exist
        if db.query(User).count() == 0:
            # Create default user
            default_user = User(
                name="Default User",
                email="user@elderlyguardian.com",
                phone="123-456-7890"
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            
            # Add default medicines
            medicines = [
                Medicine(
                    user_id=default_user.id,
                    name="Aspirin",
                    dosage="100mg",
                    time="18:00",
                    after_meal=True,
                    taken=False
                ),
                Medicine(
                    user_id=default_user.id,
                    name="Metformin",
                    dosage="500mg",
                    time="08:00",
                    after_meal=True,
                    taken=True
                ),
                Medicine(
                    user_id=default_user.id,
                    name="Atorvastatin",
                    dosage="20mg",
                    time="21:00",
                    after_meal=False,
                    taken=False
                )
            ]
            
            # Add default appointments
            appointments = [
                Appointment(
                    user_id=default_user.id,
                    doctor_name="Dr. Smith",
                    date="2024-12-27",
                    time="10:30",
                    reason="Routine Checkup"
                ),
                Appointment(
                    user_id=default_user.id,
                    doctor_name="Dr. Johnson",
                    date="2024-12-30",
                    time="14:00",
                    reason="Follow-up"
                )
            ]
            
            # Add default vitals
            vitals = Vitals(
                user_id=default_user.id,
                bp_systolic=118,
                bp_diastolic=79,
                sugar_level=95,
                heart_rate=72,
                notes="Initial health baseline"
            )
            
            db.add_all(medicines)
            db.add_all(appointments)
            db.add(vitals)
            db.commit()
            
            print("✅ Default user and data initialized in SQLite database")
        else:
            print("✅ SQLite database already contains data")
            
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_default_data()
