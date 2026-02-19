import os
import httpx
import json
from datetime import datetime

# CONFIG: Using existing Groq or Gemini key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class EvolutionEngine:
    def __init__(self):
        self.codebase_summary = ""

    async def audit_codebase(self):
        """Scans the directory to understand the project structure and tech stack."""
        files_to_scan = [
            "frontend/package.json",
            "backend/main.py",
            "backend/database_simple.py",
            "frontend/src/components/CommunityChat.tsx"
        ]
        
        summary = "Current Project State:\n"
        for file_path in files_to_scan:
            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()[:1000] # Just a snippet
                    summary += f"--- {file_path} ---\n{content}\n"
        
        self.codebase_summary = summary
        return summary

    async def get_evolution_proposals(self):
        """Asks AI for modernization and trend-based improvements."""
        await self.audit_codebase()
        
        prompt = f"""
        You are a Self-Developing AI System. Analyze the current project state below and propose 3 specific evolutionary upgrades.
        Upgrades should focus on 2026 tech trends:
        1. AI-Native UX (Predictive features).
        2. Hyper-Efficiency (Performance/Bundle size).
        3. Real-time Collaboration.

        Project State:
        {self.codebase_summary}

        Output a JSON object with a list of "proposals":
        [
            {{
                "id": "unique-id",
                "title": "Proposal Title",
                "description": "Short description of the trend and impact.",
                "type": "UI" | "Feature" | "Performance",
                "difficulty": "Low" | "Medium" | "High",
                "technical_blueprint": "Detailed technical steps or code strategy to implement this."
            }}
        ]
        """
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {{"role": "system", "content": "You are a visionary technical architect."}},
                            {{"role": "user", "content": prompt}}
                        ],
                        "response_format": {{"type": "json_object"}}
                    },
                    timeout=30.0
                )
                data = response.json()
                content_str = data['choices'][0]['message']['content']
                return json.loads(content_str)
            except Exception as e:
                print(f"[EVOLUTION ERROR] {e}")
                return {"proposals": []}

# Global instance for main.py
engine = EvolutionEngine()
