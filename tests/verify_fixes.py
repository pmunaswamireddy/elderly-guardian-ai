import requests
import time
import sys
import subprocess
import os

BASE_URL = "http://localhost:8000"

def log(msg):
    print(f"[TEST] {msg}")

def test_health():
    try:
        resp = requests.get(f"{BASE_URL}/health")
        if resp.status_code == 200:
            log("[PASS] Backend is running on port 8000")
            return True
    except requests.exceptions.ConnectionError:
        return False
    return False

def test_auth_logic():
    log("Testing Authentication Logic...")
    
    # 1. Signup
    user_data = {
        "name": "Test User",
        "email": f"test_{int(time.time())}@example.com",
        "password": "password123",
        "phone": "1234567890"
    }
    
    resp = requests.post(f"{BASE_URL}/api/signup", json=user_data)
    if resp.status_code != 200:
        log(f"[FAIL] Signup failed: {resp.text}")
        return False
    
    log("[PASS] Signup successful")
    
    # 2. Login with Email
    login_email = {
        "name_or_email": user_data["email"],
        "password": user_data["password"]
    }
    resp = requests.post(f"{BASE_URL}/api/login", json=login_email)
    if resp.status_code == 200 and resp.json()["success"]:
        log("[PASS] Login with EMAIL successful")
        user_id = resp.json()["user"]["id"]
    else:
        log(f"[FAIL] Login with EMAIL failed: {resp.text}")
        return False

    # 3. Login with Name
    login_name = {
        "name_or_email": user_data["name"],
        "password": user_data["password"]
    }
    resp = requests.post(f"{BASE_URL}/api/login", json=login_name)
    if resp.status_code == 200 and resp.json()["success"]:
        log("[PASS] Login with NAME successful")
    else:
        log(f"[FAIL] Login with NAME failed: {resp.text}")
        return False
        
    return user_id

def test_vitals_history(user_id):
    log("Testing Vitals History Endpoint...")
    
    # Add some dummy vitals
    for i in range(3):
        vitals_data = {
            "user_id": user_id,
            "bp_systolic": 120 + i,
            "bp_diastolic": 80 + i,
            "sugar_level": 95 + i,
            "heart_rate": 70 + i,
            "notes": f"Test note {i}"
        }
        requests.post(f"{BASE_URL}/vitals", json=vitals_data)
        
    # Fetch history
    resp = requests.get(f"{BASE_URL}/vitals/history?user_id={user_id}&limit=5")
    if resp.status_code == 200:
        history = resp.json()["history"]
        if len(history) >= 3:
            log(f"[PASS] Vitals history fetched successfully (Found {len(history)} records)")
            return True
        else:
            log(f"[WARN] Vitals history count mismatch: {len(history)}")
            return False
    else:
        log(f"[FAIL] Failed to fetch vitals history: {resp.text}")
        return False

def main():
    if not test_health():
        log("[FAIL] Server not running on localhost:8000. Please start it first.")
        sys.exit(1)
        
    user_id = test_auth_logic()
    if user_id:
        test_vitals_history(user_id)
        test_medicine_deletion(user_id)

def test_medicine_deletion(user_id):
    log("Testing Medicine Deletion Persistence...")
    
    # 1. Add Medicine
    med_data = {
        "user_id": user_id,
        "name": "Test Delete Med",
        "dosage": "500mg",
        "time": "10:00",
        "after_meal": True
    }
    resp = requests.post(f"{BASE_URL}/medicines", json=med_data)
    if resp.status_code != 200:
        log(f"[FAIL] Failed to add medicine: {resp.text}")
        return False
        
    med_id = resp.json()["medicine"]["id"]
    log(f"[PASS] Added medicine with ID: {med_id}")
    
    # 2. Verify it exists
    resp = requests.get(f"{BASE_URL}/medicines?user_id={user_id}")
    meds = resp.json()["medicines"]
    if not any(m["id"] == med_id for m in meds):
        log("[FAIL] Medicine not found in list immediately after creation")
        return False
        
    # 3. Delete it
    resp = requests.delete(f"{BASE_URL}/medicines/{med_id}")
    if resp.status_code != 200:
        log(f"[FAIL] Delete request failed: {resp.text}")
        return False
    log("[PASS] Delete request successful")
    
    # 4. Verify it is GONE
    resp = requests.get(f"{BASE_URL}/medicines?user_id={user_id}")
    meds = resp.json()["medicines"]
    if any(m["id"] == med_id for m in meds):
        log(f"[FAIL] Medicine {med_id} STILL EXISTS after deletion! Persistence failure.")
        return False
        
    log("[PASS] Medicine successfully deleted and verified gone from DB.")
    return True

if __name__ == "__main__":
    main()
