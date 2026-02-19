## Copilot / AI Agent Instructions — Elderly Guardian AI

Be concise. The goal is to make an AI coding agent immediately productive in this repo.

- **Big picture**: two-process architecture.
  - Frontend: React + TypeScript + Vite in [frontend](frontend). Run with `npm run dev` from that folder. See [frontend/package.json](frontend/package.json).
  - Backend: FastAPI Python service in [backend](backend). Entrypoint: [backend/main.py](backend/main.py) which also imports the lightweight SQLite layer [backend/database_simple.py](backend/database_simple.py).

- **Start / dev commands** (local):
  - Frontend (dev):
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
  - Backend (dev):
    ```bash
    cd backend
    pip install -r requirements.txt
    python main.py
    ```

- **Key environment / runtime notes**:
  - `GEMINI_API_KEY` (or other LLM keys) may be referenced in [backend/main.py](backend/main.py). Set it in environment when testing AI features.
  - The simple DB file is `elderly_guardian.db` (default path created by [backend/database_simple.py](backend/database_simple.py)). Tests and local runs rely on this SQLite file being writable.
  - CORS is enabled in the backend (allow all origins) to simplify local frontend↔backend communication.

- **API surface (representative endpoints)** — use these in integration tasks or component wiring:
  - `POST /api/signup`, `POST /api/login` — auth ([backend/main.py](backend/main.py)).
  - `GET/POST /medicines`, `PUT /medicines/{id}`, `DELETE /medicines/{id}` — medicine CRUD.
  - `GET/POST /vitals`, `GET /vitals/history` — vitals monitoring.
  - `POST /ai/chat`, `POST /voice/parse` — NLP/assistant entry points (Gemini integration).
  - `POST /ocr/prescription`, `POST /analyze/face`, `POST /predict/disease` — image/AI endpoints.
  - Admin verbs under `/admin/*` (users, bans, language updates).

- **Project conventions & patterns** (what to follow when editing):
  - Frontend uses Tailwind + utility-first classes and a small helper `cn()` in [frontend/src/utils/cn.ts](frontend/src/utils/cn.ts) (preferred over manual class concatenation).
  - Components use mock/placeholder data and camera/browser APIs (example: [frontend/src/components/FacialAnalysis.tsx](frontend/src/components/FacialAnalysis.tsx)). Prefer preserving the same JSON shapes when changing UI ↔ API.
  - Backend uses a tiny, explicit SQLite wrapper (`SimpleDB`) instead of ORMs. Database migrations are ad-hoc (PRAGMA + ALTER statements). When adding columns, prefer defensive code that checks PRAGMA table_info before ALTER.
  - AI integrations in the backend include `google.generativeai`, `edge_tts`, `fuzzywuzzy` — be cautious adding heavy dependencies; they appear in `backend/requirements.txt`.

- **Developer workflows & debugging tips**:
  - To quickly test API endpoints, run backend and curl or use Postman. Health endpoints: `GET /` and `GET /health` in [backend/main.py](backend/main.py).
  - The backend emits many debug prints (e.g., DB migrations, auth debug). Use these logs to understand runtime DB schema differences.
  - Many endpoints return mocked or simulated results (OCR, facial analysis) — useful when working offline or writing UI tests.

- **When modifying APIs / data shapes**:
  - Update both backend handlers and any frontend component that consumes the JSON shape (search for endpoint names in `frontend/src/` to find callers).
  - Keep default values and keys stable: components expect keys like `medicines`, `vitals`, `detections`, `predictions`.

- **Security & credentials**:
  - There is a hard-coded fallback `GEMINI_API_KEY` default in [backend/main.py](backend/main.py). Replace with environment-managed secrets for production — but tests rely on the current behavior.

- **Files to inspect first when asked for a change**:
  - Overview: [README.md](README.md)
  - Backend entry: [backend/main.py](backend/main.py)
  - Backend DB: [backend/database_simple.py](backend/database_simple.py)
  - Frontend entry & deps: [frontend/package.json](frontend/package.json), [vite.config.ts](frontend/vite.config.ts)
  - Representative UI: [frontend/src/components/FacialAnalysis.tsx](frontend/src/components/FacialAnalysis.tsx)

If anything here is unclear or you want more granular rules (linting, unit-test patterns, or CI flow), tell me which area to expand and I will iterate. 
