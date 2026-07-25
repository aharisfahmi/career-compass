# Checklist Pengerjaan Proyek CareerCompass (10 Hari Kerja)

> Stack acuan: lihat `TECH_STACK.md`. Arsitektur: lihat `ARCHITECTURE.md`.

## Phase 1: Monorepo Setup & Data Pipeline (Hari 1–3)

- [ ] **Task 1.1**: Inisialisasi monorepo dengan Moon Repo: `uv init --bare`, `moon init`, `mkdir apps data scripts`.
- [ ] **Task 1.2**: Setup `apps/agent-api/` — `uv init`, `uv add fastapi uvicorn pydantic pydantic-settings sqlmodel aiosqlite greenlet alembic celery redis chromadb openai agno mcp chonkie pandas mistralai python-multipart tavily-python ddgs langfuse openinference-instrumentation-openai pytest anyio`.
- [ ] **Task 1.3**: Setup `apps/agent-frontend/` — `pnpm create t3-app`, tambah `@ai-sdk/react`, `ai`, `react-markdown`, `pnpm dev` jalan di `localhost:5173`.
- [ ] **Task 1.4**: Konfigurasi `.moon/workspace.yml` projects: `apps/*`. Copy `.env.example` (sudah tersedia) ke `.env` dan isi nilai sesungguhnya (lihat `ARCHITECTURE.md §16.1` untuk 3 skenario endpoint).
- [ ] **Task 1.5**: Isi `data/raw_jobs.csv` hingga minimal 120 baris, 6 supported roles, 15+ lowongan per role. (Header template + 3 contoh baris sudah tersedia.)
- [ ] **Task 1.6**: Isi `data/learning_resources.json` hingga minimal 30 item dengan skills, language, cost, duration. (Template 3 contoh sudah tersedia.)
- [ ] **Task 1.7**: Implementasi `app/services/ingest.py` — baca CSV via Pandas, embed via `text-embedding-3-small`, simpan ke ChromaDB `data/chroma_db/`. Sediakan `--recreate` flag.
- [ ] **Task 1.8**: Buat `tests/test_ingest.py` — verifikasi `collection.count() >= 120` dan metadata lengkap.

## Phase 2: Database, MCP Server & Deterministic Scoring (Hari 4–5)

- [ ] **Task 2.1**: Inisialisasi Alembic: `uv run alembic init alembic`. Set `target_metadata = SQLModel.metadata` di `env.py`. Generate + apply revision awal (`session` table untuk Agno).
- [ ] **Task 2.2**: Implementasi `app/core/session_db.py` — `create_async_engine("sqlite+aiosqlite:///./data/career_compass.db")` + `async_session`.
- [ ] **Task 2.3**: Implementasi `app/utils/scoring.py` (`calculate_role_fit_score`) persis seperti `ARCHITECTURE.md §7`. Sertakan unit test `tests/test_scoring.py` untuk boundary case.
- [ ] **Task 2.4**: Implementasi `app/utils/cv_parser.py` — wrapper async Mistral OCR untuk PDF base64.
- [ ] **Task 2.5**: Inisialisasi FastMCP Server di `app/mcp/server.py` (transport STDIO).
- [ ] **Task 2.6**: Buat 6 FastMCP Tools di `app/mcp/tools.py`: `search_job_market`, `get_role_skill_stats`, `normalize_skills`, `calculate_role_fit`, `get_salary_benchmark`, `search_learning_resources`. Tiap tool wajib docstring "When to use" + return structured JSON.
- [ ] **Task 2.7**: Implementasi `app/services/web_search.py` — `tavily_search()` (dengan `include_domains` filter) + `duckduckgo_fallback()`. Patokan domain: coursera.org, udemy.com, freecodecamp.org, youtube.com, edx.org, scrimba.com, kode.id.
- [ ] **Task 2.8**: Implementasi hybrid `search_learning_resources` (ChromaDB → Tavily → DDGS) dengan caching hasil web ke collection `learning_resources` selama sesi (lihat `ARCHITECTURE.md §5.1`).
- [ ] **Task 2.9**: Unit test `tests/test_mcp_tools.py` untuk semua 6 tools dengan mock ChromaDB + mock Tavily/DDGS.

## Phase 3: Sub-Agents (Agno) & Orchestrator (Hari 6–7)

- [ ] **Task 3.1**: Implementasi `app/agents/profile_agent.py` — `build_profile_agent()` return `agno.agent.Agent`, structured output `ExtractedProfile`, tool `_parse_cv`.
- [ ] **Task 3.2**: Implementasi `app/agents/market_agent.py` — panggil `search_job_market`, `get_role_skill_stats`, `get_salary_benchmark`. Output `MarketEvidence`.
- [ ] **Task 3.3**: Implementasi `app/agents/match_agent.py` — panggil `calculate_role_fit` (deterministik), `normalize_skills`. Output `RoleFitResult` per role.
- [ ] **Task 3.4**: Implementasi `app/agents/roadmap_agent.py` — panggil `search_learning_resources`. Output `LearningRoadmap` (30/60/90).
- [ ] **Task 3.5**: Implementasi `app/agents/quality_agent.py` — cek citation, kontradiksi, unsupported claim. Set `quality_approved: bool`. Output `CareerBlueprint`.
- [ ] **Task 3.6**: Implementasi `app/workflow/state.py` (`CareerOptimizerState` TypedDict) dan `app/workflow/orchestrator.py` (`run_workflow` async + conditional routing + `MAX_REVISIONS = 1`).
- [ ] **Task 3.7**: Test end-to-end `tests/test_workflow.py` dengan 1 sample profil — cek state transitions & fallback path untuk `retrieved_jobs < 5`.

## Phase 4: Backend API, Celery, SSE Streaming (Hari 8)

- [ ] **Task 4.1**: Buat `app/core/celery_app.py` (Celery + Redis broker). Buat `app/workflow/tasks.py` (`run_career_blueprint_task` + publish progress via Redis PubSub).
- [ ] **Task 4.2**: Implementasi `app/api/main.py` — FastAPI app, `CORSMiddleware` allow `["*"]` untuk dev, `set_default_openai_api_key()`.
- [ ] **Task 4.3**: Router `POST /workflow/submit` → enqueue Celery task, return `{job_id}`.
- [ ] **Task 4.4**: Router `GET /workflow/{job_id}/stream` → SSE `StreamingResponse` (subscribe Redis PubSub channel `workflow:{job_id}`).
- [ ] **Task 4.5**: Router `GET /session/{session_id}` → ambil saved blueprint dari SQLite.
- [ ] **Task 4.6**: Init Langfuse di `app/core/observability.py`. Pastikan trace tampil di Langfuse dashboard untuk 1 run.

## Phase 5: Frontend, UI Workflow & Career Blueprint (Hari 9)

- [ ] **Task 5.1**: `ProfileForm.tsx` — input field wajib + opsional, validasi client-side.
- [ ] **Task 5.2**: `CvUpload.tsx` — upload PDF, POST ke `/profile/extract` (return `ExtractedProfile` draft).
- [ ] **Task 5.3**: Komponen konfirmasi profil (editable list skills/experience) sebelum submit workflow.
- [ ] **Task 5.4**: `useWorkflowStream.ts` hook — `DefaultChatTransport` ke `/workflow/{job_id}/stream`, parsing SSE frames (start-step/text-delta/finish-step).
- [ ] **Task 5.5**: `WorkflowProgress.tsx` — render tahap aktif dari SSE event (PRD FR-13).
- [ ] **Task 5.6**: `AgentTrace.tsx` — tampilkan nama agent, tool dipanggil, status, durasi (PRD FR-14).
- [ ] **Task 5.7**: `CareerBlueprint.tsx` — render `CareerBlueprint` JSON: top paths, skor, komponen, skill gap matrix, roadmap 30/60/90, sources, limitations.
- [ ] **Task 5.8**: Tombol unduh report dalam Markdown + JSON (PRD FR-12).

## Phase 6: Testing, Evals & Demo Readiness (Hari 10)

- [ ] **Task 6.1**: Buat 12 profil sintetis di `scripts/seed_db.py` (mencakup 6 supported roles + 3 profil incomplete + 2 profil target kurang cocok).
- [ ] **Task 6.2**: Jalankan end-to-end pipeline untuk 12 profil. Catat latency (p50, p95), cost (Langfuse), token usage, hallucination rate (Quality Agent).
- [ ] **Task 6.3**: Manual eval rubric (7 dimensi per PRD §20) untuk minimal 4 profil sampel.
- [ ] **Task 6.4**: Verifikasi Low Confidence fallback (role dengan < 5 dokumen), MCP timeout handling, schema validation error.
- [ ] **Task 6.5**: Lengkapi `README.md` dengan demo guide & link Langfuse dashboard. Pastikan `.env.example` sinkron dengan config terbaru.
- [ ] **Task 6.6**: Pastikan `.env.example` lengkap dan tidak ada secret di repo. Run `uv run pytest` dan `pnpm build` untuk final smoke test.
- [ ] **Task 6.7**: Rehearsal demo dengan minimal 3 sample profiles siap pakai.
