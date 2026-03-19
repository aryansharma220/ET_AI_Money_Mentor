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
