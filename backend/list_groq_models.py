import httpx
import os

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or "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"

def list_models():
    try:
        response = httpx.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"}
        )
        if response.status_code == 200:
            models = response.json()
            for model in models['data']:
                print(f"- {model['id']}")
        else:
            print("Error:", response.text)
    except Exception as e:
        print("Exception:", str(e))

if __name__ == "__main__":
    list_models()
