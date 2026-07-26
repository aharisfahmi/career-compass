# CareerCompass 🧭 - AI Career Path Optimizer

CareerCompass is a **Multi-Agent System** and **MCP (Model Context Protocol)** based application that helps career switchers and fresh graduates discover the most realistic career paths through real labor market data analysis.

---

## 🌟 Key Features

1. **CV & Profile Parser**: Structured profile extraction from PDF/TXT documents via Mistral OCR.
2. **Local Vector Search (ChromaDB)**: Semantic search across a curated dataset of 120+ job listings.
3. **FastMCP Server**: Standardized external tool integration for labor market analysis.
4. **Hybrid Learning Resource Search**: ChromaDB (curated) → Tavily → DuckDuckGo fallback chain for fresh, verifiable course recommendations.
5. **Deterministic Role Fit Scoring**: Hallucination-free match scoring powered by pure Python algorithms.
6. **Quality Gate Agent**: Validation agent that ensures every recommendation claim is backed by job listing evidence citations.
7. **Career Blueprint**: Structured output containing fit analysis, skill gaps, and a 30/60/90-day roadmap.
8. **Streaming UX**: Real-time workflow progress via Server-Sent Events.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    agent-frontend (React+Vite)                  │
│  ProfileForm / CvUpload / WorkflowProgress / CareerBlueprint    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + SSE (AI SDK DefaultChatTransport)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      agent-api (FastAPI)                        │
│  Routers: /api/v1/workflow/submit, /api/v1/workflow/{id}/stream, /api/v1/session     │
└────────────────────────────┬────────────────────────────────────┘
                             │ Celery task
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Celery Worker (Python orchestrator)             │
│  run_workflow: Profile → Market → Match → Roadmap → Quality    │
│         (conditional routing, 1 retry, fallback on low data)    │
└─────┬──────────────────┬──────────────────────┬─────────────────┘
      │ Agno Agent       │ FastMCP Tools         │ Langfuse trace
      ▼                  ▼                       ▼
┌──────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Mistral │    │  ChromaDB        │    │  Langfuse        │
│  OCR/LM  │    │  (job_postings,  │    │  (cost, latency, │
│          │    │   learning_res)  │    │   hallucination) │
└──────────┘    └──────────────────┘    └──────────────────┘
```

Data flows top to bottom; Redis acts as Celery broker + PubSub channel for SSE progress events.

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites

- Python 3.11+
- Node.js 18+ and PNPM (`npm i -g pnpm`)
- `uv` package manager (`curl -sSf https://astral.sh/uv/install.sh | sh`)
- Moon Repo (`curl -fsSL https://moonrepo.dev/install.sh | bash`)
- Redis (`apt install redis-server` or `docker run -d -p 6379:6379 redis`)

### 2. Clone Repository

```bash
git clone https://github.com/aharisfahmi/career-compass.git
cd career-compass
```

### 3. Configure Environment Variables

Copy `.env.example` (located at repo root, single source of truth) to `.env`:

```bash
cp .env.example .env
```

Populate the `.env` file:

```ini
# ─── LLM Endpoint (utama) ──────────────────────────────────────────
# OpenAI asli: isi OPENAI_API_KEY saja, biarkan OPENAI_BASE_URL kosong.
# OpenAI-compatible (OpenRouter/Groq/Together/custom gateway): isi OPENAI_BASE_URL.
OPENAI_API_KEY=sk-proj-your-openai-key-here
OPENAI_BASE_URL=                          # kosongkan untuk OpenAI asli
LLM_MODEL=gpt-4o-mini

# ─── Embedding Endpoint (fallback ke OPENAI_* bila dikosongkan) ────
# Isi HANYA bila endpoint LLM utama tidak support /v1/embeddings
# (mis. OpenRouter, Groq, Together tidak punya embedding endpoint).
# Bila dikosongkan → otomatis pakai OPENAI_API_KEY + OPENAI_BASE_URL.
EMBEDDING_API_KEY=                        # kosong = pakai OPENAI_API_KEY
EMBEDDING_BASE_URL=                       # kosong = pakai OPENAI_BASE_URL
EMBEDDING_MODEL=mistral-embed

# ─── Provider Khusus ───────────────────────────────────────────────
MISTRAL_API_KEY=your-mistral-key-here     # wajib: CV parsing OCR

# Web search (opsional — bila kosong, otomatis pakai DuckDuckGo gratis)
TAVILY_API_KEY=tvly-xxx

# ─── Infra Lokal ───────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=sqlite+aiosqlite:///./data/career_compass.db

# ─── Observability (opsional untuk dev, wajib untuk demo) ─────────
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Config LLM vs Embedding — Skenario Cepat

| Endpoint Anda Support | Yang Perlu Diisi |
|---|---|
| ✅ LLM **dan** embedding (OpenAI asli, vLLM lengkap) | `OPENAI_*` saja, biarkan `EMBEDDING_*` kosong |
| ❌ LLM saja (OpenRouter, Groq, Together) | `OPENAI_*` + `EMBEDDING_API_KEY` (provider terpisah) |

Lihat `ARCHITECTURE.md §16` untuk 3 contoh skenario konfigurasi (OpenAI asli / OpenRouter / Mistral embedding).

### 4. Install Backend Dependencies

```bash
cd apps/agent-api
uv sync
uv run alembic upgrade head
```

### 5. Ingest Dataset into ChromaDB

Build the local vector DB from the CSV file:

```bash
uv run python app/services/ingest.py
```

Expected output: `documents_ingested: 120+`.

### 6. Install Frontend Dependencies

```bash
cd ../agent-frontend
pnpm install
```

---

## 🖥️ Running the Application

### Local Dev (3 terminals)

**Terminal 1 — FastAPI backend:**

```bash
cd apps/agent-api
uv run uvicorn app.api.main:app --reload --port 8000
```

**Terminal 2 — Celery worker:**

```bash
cd apps/agent-api
uv run celery -A app.core.celery_app worker --loglevel=info --pool=threads
```

**Terminal 3 — React frontend:**

```bash
cd apps/agent-frontend
pnpm dev
```

Open `http://localhost:5173` in your browser.

> Or use Moon Repo to run both apps concurrently: `moon run dev`

---

## 🧪 Unit Testing & Evals

Run the automated test suite:

```bash
cd apps/agent-api
uv run pytest
```

End-to-end evaluation across 12 synthetic profiles is available via:

```bash
uv run python scripts/seed_db.py
uv run python scripts/run_evals.py
```

Latency, cost, token usage, and hallucination metrics are reported to the Langfuse dashboard.

### UI Screenshot Test (Playwright)

Capture screenshots of each UI step (form → confirmation → blueprint) using Playwright CLI:

```bash
# Via pnpm:
cd apps/agent-frontend
pnpm test:screenshot

# Or directly:
bash scripts/test-ui-screenshots.sh
```

Screenshots are saved to `~/pictures/01-home.png` through `~/pictures/04-career-blueprint.png`.

---

## 📊 Measuring Agent Performance

CareerCompass implements four measurement pillars required by the assignment:

| Metric | Source | Tool |
|---|---|---|
| **Cost** | Per agent + per tool | Langfuse Cost Breakdown |
| **Latency** | End-to-end workflow p50/p95 | Langfuse Latency dashboard |
| **Accuracy** | Manual rubric (7 dims, PRD §20) + LLM-as-Judge | `scripts/run_evals.py` |
| **Hallucination** | Unsupported-claim rate vs total claims | Quality Agent + Langfuse score |

---

## 📄 Final Assignment Requirements Compliance

| Requirement | Status | Code Location |
|---|---|---|
| **PRD** | ✅ Done | `PRD.md` |
| **FastAPI + SQLModel + Alembic + Celery + Redis + SQLite** | ✅ Done | `apps/agent-api/` |
| **Frontend (React + Vite + TanStack)** | ✅ Done | `apps/agent-frontend/` |
| **Agent Framework (Agno)** | ✅ Done | `apps/agent-api/app/agents/` |
| **MCP (FastMCP)** | ✅ Done | `apps/agent-api/app/mcp/` (6 tools) |
| **Vector DB & Embeddings** | ✅ Done | `apps/agent-api/app/services/vector_store.py` + ChromaDB |
| **Sub-agents (5 specialized)** | ✅ Done | `app/agents/{profile, market, match, roadmap, quality}_agent.py` |
| **Agentic Workflow + Conditional Routing** | ✅ Done | `app/workflow/orchestrator.py` (1 retry, low-data fallback) |
| **Deterministic Scoring** | ✅ Done | `app/utils/scoring.py` (no LLM) |
| **CV Parsing (Mistral OCR)** | ✅ Done | `app/utils/cv_parser.py` |
| **Observability** | ✅ Done | Langfuse via `app/core/observability.py` |

---

## 🗂️ Documentation Map

| Document | Purpose |
|---|---|
| `PRD.md` | Product requirements (final) |
| `TECH_STACK.md` | Technology decisions — single source of truth for dependencies |
| `ARCHITECTURE.md` | Detailed technical architecture & file layout |
| `TASKS.md` | Day-by-day implementation checklist (10 days) |
| `AGENTS.md` | Coding agent rules & guardrails |
