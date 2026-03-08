
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()
KEY = os.getenv("OPENROUTER_API_KEY")

async def get_free_models():
    url = "https://openrouter.ai/api/v1/models"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {KEY}"})
        if resp.status_code == 200:
            models = resp.json().get("data", [])
            free_models = [m["id"] for m in models if ":free" in m["id"] or "free" in m.get("name", "").lower() or (m.get("pricing") and float(m["pricing"]["prompt"]) == 0)]
            print(json.dumps(free_models, indent=2))
        else:
            print(f"Error: {resp.status_code}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(get_free_models())
