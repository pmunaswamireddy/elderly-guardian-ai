
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

def list_models():
    print("Listing available Gemini models (New SDK):")
    try:
        # The new SDK has list_models as an iterator or list
        for m in client.models.list():
            print(f"Name: {m.name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_models()
