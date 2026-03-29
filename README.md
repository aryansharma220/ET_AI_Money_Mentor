# AI Money Mentor

Production-ready MVP skeleton for a deterministic personal finance mentor.

## Project Structure

```text
ET_AI/
  app/
    main.py
    models.py
    api/
      routes.py
    services/
      finance.py
      behavior.py
      llm.py
      auth.py
    core/
      config.py
    db/
      database.py
      models.py
  frontend/
    src/
      App.jsx
      components/
      services/api.js
  docs/
    archive/
      legacy-requirement-notes.md
  requirements.txt
```

## Backend Setup

1. Create and activate a Python virtual environment.
1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Start API server:

```bash
uvicorn app.main:app --reload
```

1. Open docs:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

1. Install Node dependencies:

```bash
cd frontend
npm install
```

1. Run dev server:

```bash
npm run dev
```

1. Open app:

```text
http://127.0.0.1:5173
```

## Environment Variables

Copy `.env.example` to `.env` at workspace root and update values as needed:

```env
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_SITE_NAME=AI Money Mentor

DATABASE_URL=sqlite:///./ai_money_mentor.db
JWT_SECRET_KEY=change-this-secret-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

EQUITY_RETURN_ANNUAL=0.12
DEBT_RETURN_ANNUAL=0.06
LIQUID_RETURN_ANNUAL=0.04
INFLATION_ANNUAL=0.05
```

## Run Tests

```bash
python -m pytest -q
```

## Deploy On Vercel

This repository is configured to deploy as a single Vercel project:

- Frontend: Vite static build from `frontend/`
- Backend: FastAPI serverless function at `api/index.py`

### One-time setup in Vercel

1. Import this repo in Vercel.
1. Keep project root at repository root (`ET_AI`).
1. Vercel will use `vercel.json` automatically.

### Environment variables to set in Vercel

Set these variables in the Vercel project settings:

- `JWT_SECRET_KEY` (required)
- `JWT_ALGORITHM` (optional, defaults to `HS256`)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (optional)
- `OPENROUTER_API_KEY` (optional, for LLM explanations)
- `OPENROUTER_MODEL` (optional)
- `OPENROUTER_BASE_URL` (optional)
- `OPENROUTER_SITE_URL` (recommended to your deployed domain)
- `OPENROUTER_SITE_NAME` (optional)
- `DATABASE_URL` (recommended: managed Postgres or other external DB)

Notes:

- If `DATABASE_URL` is not set on Vercel, the app falls back to SQLite at `/tmp/ai_money_mentor.db`.
- `/tmp` is ephemeral in serverless, so data is not durable across cold starts/redeploys.
- For persistent data, use an external database and set `DATABASE_URL`.

### API URL behavior

- In production, frontend calls same-origin `/api/v1/...`.
- In local frontend dev (`npm run dev`), Vite proxies `/api` to `http://127.0.0.1:8000`.

## Current Endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/plan`
- `POST /api/v1/whatif`
- `POST /api/v1/plans/save` (auth required)
- `GET /api/v1/plans` (auth required)

## Behavioral Layer

- Deterministic behavioral flags (low savings, high spending risk, no investments, debt pressure)
- Micro-nudge engine with structured severity levels (`info`, `warning`, `celebration`)
- Gamification output with points, badges, and progress percent
- Financial personality labels for demo-friendly personalization
- LLM-assisted coaching observations and scenario summaries with deterministic fallback

## Notes

- All finance calculations are deterministic in `app/services/finance.py`.
- LLM layer in `app/services/llm.py` only explains already-computed outputs.
- If OpenRouter is unavailable, explanation falls back to deterministic template text.
- All API responses are structured JSON via Pydantic models.
- Automated tests for finance logic and API contracts are available in `tests/`.
