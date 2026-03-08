
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

def list_models():
    print("Listing available Gemini models:")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"ID: {m.name}, DisplayName: {m.display_name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_models()
