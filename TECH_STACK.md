# TECH_STACK.md — Technology Decisions (Single Source of Truth)

> **Tujuan dokumen ini:** Menjadi satu-satunya acuan teknologi/library yang **dipakai** dalam implementasi CareerCompass.
> Setiap dependensi yang ditambahkan ke `pyproject.toml` / `package.json` **wajib** ada di §1.
> File markdown lain (`ARCHITECTURE.md`, `TASKS.md`, `README.md`, `AGENTS.md`) **wajib conform** ke dokumen ini.

---

## 0. Cara Membaca

Status simbol:
- ✅ **Dipakai** — bagian dari stack implementasi.
- ⚠️ **Bersyarat** — dipakai hanya pada kondisi tertentu (lihat catatan).
- 🚫 **Tidak dipakai** — eksplisit tidak dipilih.

### Prinsip Ekstensi Fitur

Setelah sebuah library/framework dipilih sebagai **base**, **fitur tambahan** dari library tersebut **diizinkan** dipakai meskipun tidak didokumentasikan eksplisit di sini. Yang dibatasi hanya penambahan **library/framework baru** di luar §1.

| Boleh | Tidak Boleh |
|---|---|
| Pakai `agno.team.Team`, `agno.workflow`, dst. (Agno adalah base) | Tambah library baru di luar §1 tanpa update dokumen ini |
| Pakai fitur ChromaDB lanjut (filters, hybrid search) | Tambah vector DB alternatif (Pinecone, Weaviate) |
| Pakai FastAPI middleware, dependencies lanjut | Ganti base framework ke library lain |
| Pakai Mistral OCR BBOX, batch mode | Tambah Tesseract + pypdf bersamaan |

---

## 1. Core Stack

### 1.1 Bahasa, Runtime, Package Manager

| Teknologi | Versi | Status | Alasan |
|---|---|---|---|
| Python | 3.11+ | ✅ | Bahasa utama backend & agent layer |
| `uv` (Astral) | latest | ✅ | Package manager Python yang cepat & deterministik |
| `.env` + environment variables | — | ✅ | Konfigurasi terpisah dari kode |

### 1.2 Backend & Web Framework

| Teknologi | Status | Alasan |
|---|---|---|
| **FastAPI** | ✅ | Web framework utama, mendukung SSE streaming, async, dependency injection |
| **Uvicorn** | ✅ | ASGI server untuk FastAPI |
| **Pydantic** (v2) | ✅ | Validation + structured output LLM |
| **Pydantic Settings** | ✅ | Konfigurasi via `.env` yang ter-tip |
| **`python-multipart`** | ⚠️ | Hanya bila butuh file upload langsung via FastAPI endpoint |

### 1.3 Database & Persistence

| Teknologi | Status | Alasan |
|---|---|---|
| **SQLite** | ✅ | Database utama MVP, file-based, tanpa server terpisah |
| **SQLModel** | ✅ | ORM (di atas SQLAlchemy), integrasi dengan Pydantic |
| **SQLAlchemy** (extension) | ✅ | Dipakai via SQLModel |
| **aiosqlite** | ✅ | Async driver SQLite untuk event loop FastAPI |
| **greenlet** | ✅ | Bridge async untuk SQLAlchemy |
| **Alembic** | ✅ | Database migration yang terkontrol |
| **Redis** | ✅ | Broker Celery + PubSub untuk approval UI |
| **Celery** | ✅ | Background task queue untuk workflow Career Blueprint yang memakan waktu > 5 detik |
| **ChromaDB** | ✅ | Vector database dengan `PersistentClient`, simpel untuk MVP |

### 1.4 Agent Orchestration

| Teknologi | Status | Alasan |
|---|---|---|
| **Agno** | ✅ **(Dipilih)** | Agent framework batteries-included, fleksibel untuk multi-provider LLM (OpenAI, Mistral, Gemini, Anthropic via OpenRouter). Fitur `agno.team`, `agno.workflow`, `agno.session`, `agno.playbook`, `agno.memory` diizinkan. |
| **OpenAI Agents SDK** (`openai-agents`) | ⚠️ (fallback) | Dipakai hanya bila ada fitur tertentu yang tidak bisa dilayani Agno. Support non-OpenAI via `AnyLLMModel` + OpenRouter. |

> 🚫 **LangGraph tidak dipakai.** Alasan: lebih cocok untuk graph-based workflow dengan kompleksitas tinggi; untuk MVP CareerCompass, koordinasi sub-agent via Python orchestrator + Agno Agent instances sudah cukup dan lebih ringan.

### 1.5 LLM Integration & Embeddings

| Teknologi | Status | Alasan |
|---|---|---|
| **OpenAI SDK** (`openai`) | ✅ | Untuk LLM & embedding (provider apa pun yg OpenAI-compatible) |
| **`mistral-embed`** | ✅ | Embedding default via Mistral (1024 dimensi, gratis) |
| **OpenRouter** | ✅ | Akses model non-OpenAI (Mistral, Claude, Gemini) via satu API |
| **Mistral API** | ✅ | LLM + OCR dari Mistral |
| **Any LLM Provider** | ✅ | Model LLM bebas dipilih sesuai kebutuhan |

> **Konfigurasi Endpoint LLM vs Embedding (Fleksibel)**
>
> Banyak provider OpenAI-compatible (OpenRouter, Groq, Together, vLLM) **tidak support endpoint `/v1/embeddings`**. Untuk mengakomodasi kedua skenario, config dipisah dengan **fallback otomatis**:
>
> ```text
> Skenario A: Endpoint sama-sama support LLM + embedding (mis. OpenAI asli)
>   → Set OPENAI_* saja, biarkan EMBEDDING_* kosong.
>
> Skenario B: Endpoint LLM tidak support embedding (mis. OpenRouter)
>   → Set OPENAI_* untuk LLM, plus EMBEDDING_API_KEY + EMBEDDING_BASE_URL
>      untuk provider embedding terpisah (mis. OpenAI asli atau Mistral).
> ```
>
> Lihat `ARCHITECTURE.md §17.1` untuk implementasi Pydantic Settings-nya.

### 1.6 MCP (Model Context Protocol)

| Teknologi | Status | Alasan |
|---|---|---|
| **FastMCP** (Python `mcp` SDK) | ✅ | MCP server utama; docstring tiap tool wajib tulis "When to use" |
| **STDIO transport** | ✅ | Untuk MCP lokal |
| **Streamable HTTP transport** (`MCPServerStreamableHttp`) | ✅ | Untuk remote MCP |
| **`MCPServerManager`** | ✅ | Multi-server consumer |

### 1.7 OCR / CV Parsing

| Teknologi | Status | Alasan |
|---|---|---|
| **Mistral OCR** (API) | ✅ **(Dipilih)** | Bisa membaca PDF selectable + scanned, ekstrak gambar via BBOX. Butuh `MISTRAL_API_KEY`. |
| **Tesseract** | ⚠️ | Alternatif gratis bila Mistral tidak tersedia; terbatas Inggris |

> 🚫 **pypdf tidak dipakai.** Alasan: terbatas pada selectable text; Mistral OCR lebih lengkap untuk variasi CV di dunia nyata.

### 1.8 RAG Optimization & Chunking

| Teknologi | Status | Alasan |
|---|---|---|
| **Chonkie** (TokenChunker, SentenceChunker, RecursiveChunker, SemanticChunker) | ✅ | Library chunking yang ringan dan cepat |
| **Cosine Similarity** | ✅ | Built-in ChromaDB |
| **Hybrid Search + Reranking** | ⚠️ | Opsional untuk recall tinggi |
| **LLM as Judge** (untuk chunking eval & answer eval) | ✅ | Eval framework non-deterministik untuk akurasi & faithfulness |
| **Prompt Caching** | ✅ | Optimasi biaya hingga 90% |
| **Batch API** | ⚠️ | Untuk offline batch eval, 50% diskon |

### 1.9 Auth & Security (P1)

| Teknologi | Status | Alasan |
|---|---|---|
| **bcrypt** (`hash_password`, `check_password_hash`) | ⚠️ | Bila autentikasi diaktifkan pasca-MVP |
| **JWT** (short-term access token) | ⚠️ | Stateless auth |
| **Session-based** (refresh token di DB) | ⚠️ | Untuk revoke capability |
| **Hybrid** (JWT access + session refresh) | ⚠️ | Best practice |

### 1.10 Guardrails & Permission

| Pattern | Status | Alasan |
|---|---|---|
| **Tool approval interaksi** | ⚠️ | Untuk tool yang mutate data |
| **Programmatic permission via context** | ✅ | Kontrol real action via callback |
| **Input guardrails** (`tripwire_triggered`) | ✅ | Proteksi input dari jailbreak/prompt extraction |
| **Output guardrails** | ✅ | Filter PII / unsupported claim sebelum respond |
| **PubSub via Redis** | ✅ | UI approval mechanism |

### 1.11 Observability & Tracing

| Teknologi | Status | Alasan |
|---|---|---|
| **Langfuse** | ✅ | Observability LLM utama (OpenTelemetry under the hood), dashboard latency/cost/token usage |
| **`openinference-instrumentation-openai`** | ✅ | Auto-trace OpenAI calls |
| **LLM Router** (LiteLLM / 9-Router) | ⚠️ | Hanya untuk skala enterprise / fallback multi-provider |

### 1.12 Frontend

| Teknologi | Status | Alasan |
|---|---|---|
| **React.js + Vite + TanStack Router/Query** | ✅ **(Dipilih)** | Frontend yang diajarkan, support SSE streaming, AI SDK chat transport |
| **TypeScript** | ✅ | Bahasa front-end yang ter-tip |
| **AI SDK** (`useChat` + `DefaultChatTransport`) | ✅ | Streaming chat transport (SSE event frames) |
| **`react-markdown`** | ✅ | Render markdown untuk chat & Career Blueprint |
| **PNPM** | ✅ | Package manager frontend (hard link global, efisien) |
| **Vue / Svelte** | 🚫 | Tidak dipakai di MVP |

> 🚫 **Streamlit tidak dipakai.** Alasan: frontend terpisah diperlukan untuk demo streaming event dan workflow visibility (PRD FR-13, FR-14); arsitektur monorepo memberi fleksibilitas lebih.

### 1.13 Deployment & Infrastructure

| Teknologi | Status | Alasan |
|---|---|---|
| **Monorepo: Moon Repo + UV + PNPM** | ✅ | Struktur repo: `apps/agent-api` + `apps/agent-frontend` |
| **Cloudflare Pages** (CDN frontend) | ✅ | Deploy frontend gratis, CDN global |
| **`wrangler`** | ✅ | CLI Cloudflare Pages |
| **VPS (Debian)** | ✅ | Deploy backend (FastAPI + Celery worker) |
| **Docker** | ✅ | Kontainerisasi backend, sandboxing wajib |
| **Systemd** (agentapi + agentworker) | ✅ | Process manager VPS |
| **Nginx** (reverse proxy, `proxy_buffering off`) | ✅ | Wajib untuk SSE streaming |
| **Certbot / Let's Encrypt** | ✅ | HTTPS gratis |
| **Tailscale** (VPN) | ⚠️ | Untuk akses aman ke self-hosted Langfuse/MCP |

### 1.14 Dev Tools

| Teknologi | Status | Alasan |
|---|---|---|
| **OpenCode / Codex CLI** | ✅ | Coding agent untuk development |
| **`AGENTS.md`** | ✅ | Konfigurasi coding agent di root repo |
| **Playwright CLI** (`@playwright/cli`) | ✅ | Screenshot test untuk UI workflow tanpa setup browser terpisah |

### 1.15 Web Search (Enrichment Layer)

> ⚠️ **Scope dibatasi:** Web search HANYA untuk enrichment `learning_resources` (kursus, tutorial, dokumen). **Tetap dilarang** untuk job postings — data lowongan wajib dari `data/raw_jobs.csv` + ChromaDB (lihat §3).

| Teknologi | Status | Alasan |
|---|---|---|
| **Tavily** (`tavily-python`) | ✅ **(Primary)** | Search API yang dirancang untuk LLM agent, hasil sudah sanitized. Mendukung `include_domains` untuk scope (mis. hanya coursera.org, freecodecamp.org). Free tier 1000 calls/bulan cukup untuk demo. |
| **DuckDuckGo** (`ddgs`) | ✅ **(Fallback)** | Gratis, tanpa API key. Dipakai bila Tavily rate-limited atau key belum dikonfigurasi. |
| **Apify** | 🚫 | Modulnya untuk scraping portal (LinkedIn, TikTok) — melanggar §3 |
| **SerpAPI** | 🚫 | Risikonya secara hukum ("nakal" mengakali Google) |

**Pola Hybrid yang Direkomendasikan:**

```text
search_learning_resources(skills, budget, language, duration)
        │
        ▼
   [1] ChromaDB `learning_resources` collection (primary, curated)
        │ jika result < top_k ATAU user minta "fresh"
        ▼
   [2] Tavily search (include_domains: coursera, udemy, freecodecamp, youtube)
        │ jika Tavily error / no key
        ▼
   [3] DuckDuckGo fallback (ddgs)
        │
        ▼
   [4] Merge + dedupe by URL + rank by relevance
```

- Butuh `TAVILY_API_KEY` di `.env` (opsional — bila kosong, langsung ke DuckDuckGo).
- Hasil Tavily/DDGS di-cache di ChromaDB selama sesi (`last_verified_at` timestamp).
- Filter domain wajib untuk hindari spam/low-quality results.

---

## 2. Testing & Evaluation

| Praktik | Status | Alasan |
|---|---|---|
| **Manual Evals** (latency, token usage, hallucination) | ✅ | Wajib untuk presentasi demo |
| **LLM as Judge** (answer accuracy, faithfulness, citation) | ✅ | Eval non-deterministik |
| **Langfuse Scoring** (boolean / categorical / numeric) | ✅ | Trace-level scoring otomatis |
| **Chunking Evals** (Coverage, Boundary, Retrieval Readiness) | ✅ | Untuk tuning RAG |
| **pytest** | ✅ | Framework testing Python standar, sudah direferensikan di `AGENTS.md` |
| **`tests/test_e2e_workflow.py`** | ✅ | Workflow E2E test (langsung, tanpa Celery) — jalankan dengan `uv run --directory apps/agent-api python tests/test_e2e_workflow.py` |
| **`scripts/test-ui-screenshots.sh`** | ✅ | UI screenshot test via Playwright CLI — `pnpm --directory apps/agent-frontend run test:screenshot` |

---

## 3. Explicit DILARANG (Negative List)

| Hal | Alasan | Alternatif |
|---|---|---|
| **Live scraping ke portal lowongan** (LinkedIn, Jobstreet, dll) | Risiko ToS, demo tidak stabil (PRD §3 Non-Goals) | Gunakan dataset CSV + ChromaDB untuk `job_postings` |
| **LLM-based scoring** (`Role Fit Score`) | Aturan PRD §11 + AGENTS.md §2 | Fungsi Python deterministik |
| **Hardcoded credentials** | Aturan AGENTS.md §2 | `os.getenv()` / Pydantic Settings |
| **Unstructured agent output** | Aturan AGENTS.md §2 | Pydantic BaseModel (`structured_output`) |
| **Fabricated evidence** | Aturan AGENTS.md §2 | Wajib `document_id` / `source_url` dari ChromaDB atau hasil web search yang verifiable |

> **Catatan tentang Web Search:** Aturan "no live scraping" di atas **spesifik untuk job postings portal**. Web search API (Tavily, DuckDuckGo) **diizinkan untuk enrichment learning resources** (lihat §1.15) karena (a) tidak melanggar ToS portal lowongan, (b) memungkinkan bukti kursus yang verifiable oleh konsumen riil, (c) memakai prinsip fallback yang diajarkan.

---

## 4. Keputusan Tech Stack & Alasan

Bagian ini merangkum keputusan-keputusan penting yang menyimpang dari pilihan umum, beserta alasannya.

| Area | Keputusan | Alasan |
|---|---|---|
| **Frontend** | FastAPI + React + Vite + TanStack | Frontend terpisah dibutuhkan untuk demo SSE streaming event dan workflow visibility (PRD FR-13/14). Arsitektur monorepo memberi batas tegas antara AI layer dan presentation layer. |
| **Agent Orchestration** | Agno (bukan LangGraph) | Fleksibilitas multi-provider LLM (bisa ganti OpenAI/Mistral/Claude/Gemini via OpenRouter tanpa rewrite). Fitur batteries-included (knowledge base, tools, session) mempercepat MVP. Multi-agent pattern via Python orchestrator + Agno Agent instances sudah cukup untuk workflow CareerCompass. |
| **CV Parsing** | Mistral OCR (bukan pypdf) | Bisa menangani PDF selectable + scanned + ekstrak gambar. Cost $2/1000 halaman masih acceptable untuk volume demo. |
| **Data Processing** | Pandas (exception) | Kanonik di Python data processing, sederhanakan agregasi skill frequency untuk MCP tool `get_role_skill_stats`. |
| **Testing** | pytest (exception) | Standar de facto Python testing, mendukung fixture & parametrize yang berguna untuk 12 profil sintetis PRD §20. |
| **Background Task** | Celery + Redis | Workflow Career Blueprint end-to-end bisa > 5 detik (NFR PRD §18). Async via Celery worker, FastAPI return `job_id` lalu polling/SSE untuk progress. |
| **Web Search (Enrichment)** | Tavily (primary) + DuckDuckGo (fallback) | Untuk MCP tool `search_learning_resources` agar tidak sekadar LLM wrapper dengan data statis — bukti yang diberikan ke user tetap fresh dan konsumen riil bisa memverifikasi URL kursus. Tidak diterapkan ke `search_job_market` (tetap ChromaDB-only demi kestabilan demo dan compliance ToS portal lowongan). Pola hybrid ChromaDB→Tavily→DDGS mengikuti prinsip fallback yang diajarkan. |

---

## 5. Aturan Pemakaian Dokumen Ini

1. **Setiap dependensi baru** yang akan ditambahkan ke `pyproject.toml` / `package.json` **wajib** ada di §1. Bila belum ada, tambahkan entri baru ke §1 terlebih dahulu (lengkapi alasan), baru masukkan ke konfigurasi.
2. **Edit ke file markdown** lain (`ARCHITECTURE`, `TASKS`, `README`, `AGENTS`) tidak boleh menyebut teknologi di luar §1.
3. **Single source of truth:** bila ada pertentangan antara `ARCHITECTURE.md`, `TASKS.md`, `README.md`, dan `AGENTS.md`, dokumen **ini** yang menang.
4. **Aturan ekstensi fitur (lihat §0):** Setelah library dipilih sebagai base, fitur tambahan dari library yang sama **diizinkan**. Yang dilarang hanya menambah **library/framework baru** di luar §1.

---

## 6. Change Log

| Tanggal | Versi | Perubahan |
|---|---|---|
| 2026-07-25 | 2.0 | Reframe sebagai dokumen keputusan tech stack murni. Rename produk ke CareerCompass. |
| 2026-07-25 | 2.1 | Tambah §1.15 Web Search Enrichment (Tavily primary + DuckDuckGo fallback) untuk `search_learning_resources`. Klarifikasi §3 bahwa larangan live scraping spesifik untuk portal lowongan. |
