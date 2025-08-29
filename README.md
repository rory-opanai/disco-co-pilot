Discovery Co‑Pilot (Vercel POC)

Purpose: A discovery co‑pilot for Account Directors (ADs) and Solution Engineers (SEs) that captures discovery in real time, suggests Next Best Questions (NBQs), tracks checklist coverage, and produces a structured summary pack with a Discovery Depth Score.

Repo Layout
- `frontend/` Next.js (App Router) + Tailwind. Contains UI and API routes for the Vercel POC (ephemeral Realtime, NBQ, coverage, post‑call).
- `db/` SQL migrations and seed scripts (pgvector playbooks)

Architecture (POC)
- Frontend: Next.js on Vercel
  - Browser mic connects to OpenAI Realtime via WebRTC using a short‑lived ephemeral token minted by `/api/realtime/ephemeral` (API key stays server‑side).
  - Transcript deltas drive UI; coverage (`/api/coverage`) and NBQ (`/api/nbq`) computed server‑side.
- API Routes (serverless on Vercel): ephemeral token minting, coverage/NBQ inference (Responses API), post‑call transcription and summarization.
- Data: Postgres with `pgvector` + `pgcrypto` for transcripts/summary/depth scores and playbook vectors.

Requirements
- Node.js 18+
- OpenAI API key with access to Realtime + Responses APIs
- Postgres 16 with `pgvector` and `pgcrypto` (Vercel Postgres/Neon recommended)

Vercel Setup
1) Create a Vercel project (Framework Preset: Next.js; Root Directory: `frontend`).
2) Set Environment Variables in Vercel (Project Settings → Environment Variables):
   - `OPENAI_API_KEY` (Required)
   - `DATABASE_URL` (Vercel Postgres/Neon connection string)
   - Optional: `REALTIME_MODEL`, `RESPONSES_MODEL`, `TRANSCRIBE_MODEL`, `EMBEDDING_MODEL`, `NEXT_PUBLIC_REALTIME_MODEL`
3) Apply DB migrations to your Postgres (run locally with psql or any SQL client):
   - `db/migrations/0001_init.sql`
   - `db/migrations/0002_pgvector.sql`
   Ensure `CREATE EXTENSION pgcrypto;` and `CREATE EXTENSION vector;` are enabled.
4) (Optional) Seed playbooks:
   - In your shell (from repo root): `OPENAI_API_KEY=... DATABASE_URL=... npm run db:seed`
5) Deploy to Vercel (CI/CD as usual). No separate backend is required for the POC.

Local Dev (no Docker)
1) Provision Postgres 16 with `pgvector` locally OR use Vercel Postgres/Neon.
2) Create `frontend/.env.local` using `frontend/.env.local.example` (set `OPENAI_API_KEY`, `DATABASE_URL`).
3) Run migrations manually (psql) using files in `db/migrations/`.
4) `npm install && npm run dev` then open http://localhost:3000

Using The App
- Start a session on the homepage (optional custom session ID).
- On the call screen, the browser requests mic permission; it connects via WebRTC directly to OpenAI Realtime using a short‑lived token minted by `/api/realtime/ephemeral`.
- You’ll see:
  - Live transcript feed
  - Checklist coverage meter (computed via `/api/coverage`)
  - NBQ card (computed via `/api/nbq`) with hotkeys (N accept, S skip)
- End & view dashboard to fetch the latest transcript and summary. Upload the call recording to `POST /api/postcall/:sessionId` as `multipart/form-data` with `audio`.

API Contracts
- Real-time outbound messages match the JSON contracts in the prompt:
  - TranscriptUpdate: `{ timestamp, speaker, text }`
  - NBQ: `{ id, question, grounded_in, confidence, checklist_category }`
  - ChecklistCoverage: `{ category, status, evidence }`

Security
- Realtime: Client connects directly to OpenAI Realtime using an ephemeral token minted server-side (API key never exposed).
- Responses/Embeddings/Transcribe: Called from serverless API routes (server-side only).

Notes
- Ensure your OpenAI account has access to Realtime beta (ephemeral sessions endpoint).
- For Neon/Vercel Postgres, enable `vector` and `pgcrypto` extensions in the database.

Limitations & Next Steps
- Speaker diarization uses a simple rule; enhancing with server VAD + role attribution will improve speaker tags.
- Expand playbooks and add ingestion UI.
- Add auth and multi-user accounts.
