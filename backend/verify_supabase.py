import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

def test_conn():
    if not URL or not KEY:
        print("❌ Missing Supabase URL or Key in .env")
        return
    
    try:
        supabase: Client = create_client(URL, KEY)
        # Try a simple select
        res = supabase.table("users").select("id").limit(1).execute()
        print("✅ Supabase Connection Successful!")
        print(f"Data found: {res.data}")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    test_conn()
