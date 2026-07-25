# Coding Agent Instructions & Guardrails - CareerCompass

## 1. Project Mission & Context
CareerCompass adalah sistem AI Agentic berbasis **Agno + FastMCP + ChromaDB**, dengan backend **FastAPI** dan frontend **React + Vite + TanStack** dalam monorepo (Moon Repo + UV + PNPM). Aplikasi ini bertujuan membantu career switcher dan fresh graduate menentukan jalur karier berbasis data pasar kerja nyata.

## 2. Strict Negative Constraints (DILARANG KERAS)
- **NO Live Scraping ke Portal Lowongan**: DILARANG membuat script scraper live ke LinkedIn, Jobstreet, atau portal lowongan lain. Data lowongan (`job_postings` collection) wajib dari `data/raw_jobs.csv` + ChromaDB.
  > **Pengecualian:** Web search API (Tavily, DuckDuckGo) **diizinkan** untuk enrichment `learning_resources` (lihat `TECH_STACK.md §1.15`). Ini bukan scraping portal lowongan — hanya search engine API standar yang hasil URL-nya bisa diverifikasi user.
- **NO LLM-based Scoring**: DILARANG menyerahkan kalkulasi `Role Fit Score` ke LLM. Skor HARUS dihitung oleh fungsi Python deterministik di `apps/agent-api/app/utils/scoring.py`.
- **NO Hardcoded Credentials**: DILARANG menaruh API Key di dalam kode. Selalu gunakan `os.getenv()` atau `pydantic-settings` via `app/core/config.py`.
- **NO Unstructured Agent Output**: Semua komunikasi antar sub-agent HARUS menggunakan Pydantic BaseModel (`structured_output`).
- **NO Fabricated Evidence**: DILARANG membuat sitasi/sumber palsu. Bukti lowongan wajib `document_id`/`source_url` dari ChromaDB. Bukti learning resource wajib URL hasil web search yang verifiable.
- **NO LangGraph**: Workflow orchestration memakai Python orchestrator + Agno Agent instances di `app/workflow/orchestrator.py`. Lihat `TECH_STACK.md` §1.4 untuk alasan.
- **NO Streamlit**: Frontend memakai React + Vite + TanStack. Lihat `TECH_STACK.md` §1.12 untuk alasan.
- **NO pypdf**: CV parsing memakai Mistral OCR. Lihat `TECH_STACK.md` §1.7 untuk alasan.

## 3. Technology Stack Rules
**Acuan tunggal:** `TECH_STACK.md`. Setiap dependensi yang ditambahkan ke `apps/agent-api/pyproject.toml` atau `apps/agent-frontend/package.json` **WAJIB** terdaftar di `TECH_STACK.md §1`. Aturan ekstensi fitur ada di `TECH_STACK.md §0`.

Ringkasan:
- **Bahasa**: Python 3.11+ (backend), TypeScript (frontend)
- **Package Manager**: `uv` (Python), `pnpm` (frontend)
- **Backend**: FastAPI + Uvicorn + Pydantic v2 + Pydantic Settings
- **Database**: SQLite via SQLModel + async (aiosqlite + greenlet) + Alembic migration
- **Background Task**: Celery + Redis (broker + PubSub untuk SSE)
- **Vector DB**: ChromaDB (`PersistentClient`)
- **Embeddings**: `text-embedding-3-small` (OpenAI)
- **Agent Framework**: Agno (fallback: OpenAI Agents SDK)
- **LLM**: Bebas (OpenAI / Mistral / OpenRouter / Anthropic / Gemini)
- **MCP**: FastMCP (Python `mcp` SDK), transport STDIO lokal
- **OCR**: Mistral OCR API
- **Chunking**: Chonkie (RecursiveChunker default)
- **Frontend**: React + Vite + TanStack Router/Query + AI SDK (`useChat` + `DefaultChatTransport`) + `react-markdown`
- **Monorepo**: Moon Repo + UV + PNPM, struktur `apps/agent-api` + `apps/agent-frontend`
- **Observability**: Langfuse (OpenTelemetry-based)
- **Testing**: pytest
- **Deployment**: VPS Debian (systemd + Nginx + Certbot) untuk backend, Cloudflare Pages untuk frontend, Docker untuk sandboxing

## 4. Coding Conventions & Quality Standards
- **Type Hints**: Wajib pada setiap parameter dan return value fungsi Python.
- **Docstrings untuk FastMCP tools**: WAJIB menjelaskan *kapan tool harus dipanggil* (When to use) dan filter yang tersedia.
- **Error Handling**: Semua panggilan API eksternal / LLM / ChromaDB / Mistral OCR WAJIB dibungkus blok `try-except` dengan penanganan fallback yang aman (lihat PRD §21).
- **Async vs Sync**: Gunakan fungsi synchronous untuk logika deterministik/scoring. Gunakan asynchronous untuk I/O (ChromaDB, LLM calls, FastMCP, Celery tasks).
- **Configuration**: Single source of truth `.env` di root monorepo. Akses via `app/core/config.py` (Pydantic Settings), jangan pernah langsung `os.getenv` di file non-config.
- **SSE Nginx**: Saat deploy, wajib `proxy_buffering off` + `proxy_read_timeout 24h` (lihat `ARCHITECTURE.md §9.5`).
- **Structured Logging**: PII tidak boleh masuk log. Setiap entry log sertakan `session_id`, `agent_name`, dan `step`.

## 5. Verification Protocol
Sebelum menganggap sebuah tugas di `TASKS.md` selesai:
1. Jalankan `uv run pytest` di `apps/agent-api` untuk memastikan tidak ada unit test yang break.
2. Jalankan `pnpm build` di `apps/agent-frontend` untuk memastikan tidak ada error TypeScript.
3. Pastikan file baru terintegrasi secara modular (three-layer separation: AI / App / Data, lihat `ARCHITECTURE.md §2`).
4. Perbarui checklist terkait di `TASKS.md` menjadi `[x]`.
5. Verifikasi tidak ada dependensi baru di luar `TECH_STACK.md §1`.
