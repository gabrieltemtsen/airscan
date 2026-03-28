# AirScan

AirScan is a full-stack SaaS for **broadcast compliance monitoring** for the **National Broadcasting Commission (NBC), Nigeria**.

**Pipeline:** Upload → Whisper transcription → Gemini breach analysis → reviewer workflow → PDF/CSV exports.

## Monorepo

```
airscan/
  frontend/   # Next.js 14 (App Router) + Clerk
  backend/    # FastAPI + SQLAlchemy + RQ worker
  docker-compose.yml
  .env.example
```

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind, shadcn/ui-style components, Clerk auth, Lucide icons, sonner toasts
- **Backend:** FastAPI, SQLAlchemy, Postgres
- **Jobs:** Redis + RQ
- **AI:** OpenAI Whisper (`whisper-1`) → Gemini 2.0 Flash (`gemini-2.0-flash`)
- **Storage:** S3-compatible (Cloudflare R2)
- **Payments:** Paystack (NGN)

## Local Development

### 1) Start Postgres + Redis

```bash
cd airscan
docker compose up -d
```

### 2) Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e .
```

Create `backend/.env` (copy from repo root `.env.example`) and set values:

- `DATABASE_URL` (points to docker postgres)
- `REDIS_URL` (points to docker redis)
- `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- S3/R2 config: `AWS_*`
- Paystack: `PAYSTACK_SECRET_KEY`

Initialize DB tables and seed the default NBC policy pack:

```bash
python -c "from app.main import init_db; init_db()"
python seed_policies.py
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Run the worker (separate terminal):

```bash
python worker.py
```

### 3) Frontend setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the Next.js app:

```bash
npm run dev
```

Visit:
- Landing: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard

## Key Product Screens

- `/` landing page (navy + gold)
- `/dashboard` stats + recent cases + usage bar
- `/upload` direct-to-storage upload (presigned PUT) and case creation
- `/cases` list of cases
- `/cases/[id]` main UX: media player + highlighted transcript + findings review workflow + PDF/CSV export
- `/policy-library` packs + clause lists + policy document upload (Gemini extraction)
- `/billing` Paystack credit top-ups + invoice history
- `/settings` account + workspace info

## API Endpoints (Backend)

- `POST /api/upload/presigned`
- `POST /api/cases` / `GET /api/cases` / `GET /api/cases/{id}` / `DELETE /api/cases/{id}`
- `GET /api/cases/{id}/transcript`
- `GET /api/cases/{id}/findings`
- `PATCH /api/findings/{id}`
- `GET /api/cases/{id}/export/pdf` / `GET /api/cases/{id}/export/csv`
- `GET /api/policy-packs` / `POST /api/policy-packs` / `GET /api/policy-packs/{id}/clauses`
- `POST /api/policy-packs/upload`
- `GET /api/user/me` / `GET /api/user/usage`
- `POST /api/billing/express/checkout` / `POST /api/billing/webhook` / `GET /api/billing/invoices`

## Notes

### Clerk JWT verification

For strict JWT verification set:

- `CLERK_JWKS_URL` (your Clerk instance JWKS URL)
- `CLERK_ISSUER`

If those are not set, the backend will **decode tokens without signature verification** (OK for local dev; not recommended for production).

### Storage URLs

The backend returns a path-style object URL: `{AWS_ENDPOINT_URL}/{bucket}/{key}`.
If you use a custom public domain for R2, set `AWS_ENDPOINT_URL` to that public base.

---

## Deployment Targets

- **Frontend:** Vercel
- **Backend API / Worker / Postgres / Redis:** Railway

