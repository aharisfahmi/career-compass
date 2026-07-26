# Checklist Pengerjaan Proyek CareerCompass (10 Hari Kerja)

> Stack acuan: lihat `TECH_STACK.md`. Arsitektur: lihat `ARCHITECTURE.md`.

## Phase 1: Monorepo Setup & Data Pipeline (Hari 1–3)

- [x] **Task 1.1**: Inisialisasi monorepo dengan Moon Repo: `uv init --bare`, `moon init`, `mkdir apps data scripts`.
- [x] **Task 1.2**: Setup `apps/agent-api/` — `uv init`, `uv add ...` semua dependensi.
- [x] **Task 1.3**: Setup `apps/agent-frontend/` — Vite + React-TS + TanStack + AI SDK.
- [x] **Task 1.4**: Konfigurasi `.moon/workspace.yml` projects: `apps/*`. `.env` terisi dari env var sistem.
- [x] **Task 1.5**: `data/raw_jobs.csv` — 120 baris, 6 supported roles, 15+ lowongan per role.
- [x] **Task 1.6**: `data/learning_resources.json` — 40 item dengan skills, language, cost, duration.
- [x] **Task 1.7**: `app/services/ingest.py` — Pandas → embed (gemini-embedding-001) → ChromaDB.
- [x] **Task 1.8**: `tests/test_ingest.py` — verifikasi `collection.count() >= 120` dan `>= 30`.

## Phase 2: Database, MCP Server & Deterministic Scoring (Hari 4–5)

- [x] **Task 2.1**: Alembic setup dengan `target_metadata = SQLModel.metadata`, migration `session` table.
- [x] **Task 2.2**: `app/core/session_db.py` — async engine + sessionmaker.
- [x] **Task 2.3**: `app/utils/scoring.py` — `calculate_role_fit_score` deterministik. Unit test boundary case.
- [x] **Task 2.4**: `app/utils/cv_parser.py` — wrapper async Mistral OCR untuk PDF base64.
- [x] **Task 2.5**: FastMCP Server di `app/mcp/server.py` (transport STDIO).
- [x] **Task 2.6**: 6 FastMCP Tools di `app/mcp/tools.py` dengan docstring "When to use" + structured JSON.
- [x] **Task 2.7**: `app/services/web_search.py` — `tavily_search()` + `duckduckgo_fallback()`.
- [x] **Task 2.8**: Hybrid `search_learning_resources` (ChromaDB → Tavily → DDGS).
- [x] **Task 2.9**: Unit test `tests/test_mcp_tools.py` — normalize_skills.

## Phase 3: Sub-Agents (Agno) & Orchestrator (Hari 6–7)

- [x] **Task 3.1**: `app/agents/profile_agent.py` — structured output `ExtractedProfile`.
- [x] **Task 3.2**: `app/agents/market_agent.py` — output `MarketEvidence`.
- [x] **Task 3.3**: `app/agents/match_agent.py` — output `RoleFitResult`.
- [x] **Task 3.4**: `app/agents/roadmap_agent.py` — output `LearningRoadmap` (30/60/90).
- [x] **Task 3.5**: `app/agents/quality_agent.py` — output `CareerBlueprint`, `quality_approved`.
- [x] **Task 3.6**: `app/workflow/state.py` (`CareerOptimizerState`) + `app/workflow/orchestrator.py` (async + conditional routing + `MAX_REVISIONS = 1`).
- [x] **Task 3.7**: Test `tests/test_workflow.py` — state transitions.

## Phase 4: Backend API, Celery, SSE Streaming (Hari 8)

- [x] **Task 4.1**: `app/core/celery_app.py` (Celery + Redis) + `app/workflow/tasks.py` (PubSub progress).
- [x] **Task 4.2**: `app/api/main.py` — FastAPI app + CORSMiddleware.
- [x] **Task 4.3**: Router `POST /api/v1/workflow/submit` → enqueue Celery task.
- [x] **Task 4.4**: Router `GET /api/v1/workflow/{job_id}/stream` → SSE `StreamingResponse`.
- [x] **Task 4.5**: Router `GET /api/v1/session/{session_id}` → blueprint dari SQLite.
- [x] **Task 4.6**: Langfuse init di `app/core/observability.py`.

## Phase 5: Frontend, UI Workflow & Career Blueprint (Hari 9)

- [x] **Task 5.1**: `ProfileForm.tsx` — input field + validasi client-side.
- [x] **Task 5.2**: `CvUpload.tsx` — upload PDF, POST ke `/api/v1/profile/extract`.
- [x] **Task 5.3**: Komponen konfirmasi profil sebelum submit workflow.
- [x] **Task 5.4**: `useWorkflowStream.ts` hook — SSE ke `/api/v1/workflow/{job_id}/stream`.
- [x] **Task 5.5**: `WorkflowProgress.tsx` — render tahap aktif dari SSE event.
- [x] **Task 5.6**: `AgentTrace.tsx` — nama agent, status, waktu.
- [x] **Task 5.7**: `CareerBlueprint.tsx` — render top paths, skor, skill gap, roadmap, sources.
- [ ] **Task 5.8**: Tombol unduh report dalam Markdown + JSON (PRD FR-12).

## Phase 6: Testing, Evals & Demo Readiness (Hari 10)

- [x] **Task 6.1**: `scripts/seed_db.py` — 4 profil sintetis (3 incomplete).
- [ ] **Task 6.2**: Jalankan end-to-end pipeline untuk 12 profil. Catat latency, cost, token usage.
- [ ] **Task 6.3**: Manual eval rubric (7 dimensi per PRD §20) untuk minimal 4 profil sampel.
- [ ] **Task 6.4**: Verifikasi Low Confidence fallback, MCP timeout handling, schema validation error.
- [ ] **Task 6.5**: Lengkapi `README.md` dengan demo guide & link Langfuse.
- [x] **Task 6.6**: `.env.example` sinkron, `uv run pytest` (12 passed), `pnpm build` (success).
- [ ] **Task 6.7**: Rehearsal demo dengan minimal 3 sample profiles siap pakai.
