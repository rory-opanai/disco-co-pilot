# Disco Co-Pilot

Live discovery call assistant with real-time transcription, coverage guidance, and post-call summaries. Built for Vercel (Next.js App Router) with Postgres + pgvector.

## Features
- Live transcription via OpenAI Realtime WebRTC with ephemeral sessions
- Real-time coverage classification against a discovery checklist
- Next Best Question (NBQ) suggestions grounded in seeded playbooks
- Post-call upload → structured summary pack JSON persisted to Postgres
- Simple integration tests for API routes

## Architecture
- Frontend/Server: Next.js 14 App Router (serverless/Vercel-friendly)
- Data: Postgres (with `pgvector`), seeded playbooks for retrieval grounding
- No separate Express server; server logic lives in Next API routes

## Prerequisites
- Node.js 18+
- Postgres with `pgcrypto` and `pgvector` extensions
- OpenAI API key with access to Realtime, Responses, Transcribe, and Embeddings

## Setup
1. Clone the repo and install deps:
   ```bash
   npm install
   ```
2. Configure environment:
   - Copy `env.example` to `.env.local` (or `.env`) at project root and set values.
   - Required: `OPENAI_API_KEY`, `DATABASE_URL`
   - Optional: `PGSSL`, `APP_TOKEN`, model overrides
3. Migrate and seed database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000

## Usage
- Live call: `/call`
  - Captures mic audio and streams to OpenAI Realtime
  - Displays transcript, coverage progress, and NBQ suggestions
  - Click "End & View Summary" to open the dashboard
- Dashboard & post-call summary: `/dashboard/[sessionId]`
  - Upload an audio file to generate a summary pack

## Environment Variables
- Required
  - `OPENAI_API_KEY`
  - `DATABASE_URL`
- Optional
  - `PGSSL` (set to `disable` for local non-SSL Postgres)
  - `APP_TOKEN` (if set, clients must send `X-Auth-Token` to API routes)
  - `REALTIME_MODEL`, `RESPONSES_MODEL`, `TRANSCRIBE_MODEL`, `EMBEDDING_MODEL`
  - `NEXT_PUBLIC_REALTIME_MODEL`

## Deploying to Vercel
- Provide the env vars above in Vercel Project Settings → Environment Variables
- Ensure your Postgres is reachable from Vercel and `PGSSL` is not `disable`

## Development Scripts
```bash
npm run dev        # Next.js dev server
npm run build      # Build for production
npm run start      # Start production server locally
npm run db:migrate # Apply SQL migrations
npm run db:seed    # Seed playbooks with embeddings
npm run test       # Run API integration tests (frontend workspace)
```

## Notes on Security & Observability
- If `APP_TOKEN` is set, Next API routes require `X-Auth-Token` to mitigate abuse
- Basic structured logs and request timing metrics are emitted from API routes
- Consider adding a WAF (Vercel Protect) and per-user rate limiting

## Contributing
- Keep server logic in Next.js API routes
- Prefer shared utils in `frontend/lib/server/*`
- Add tests in `frontend/tests/*`
