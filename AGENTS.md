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
- **Embeddings**: `mistral-embed` (Mistral) atau configurable via env
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

## 5. Agno Agent Conventions (v2.8.x)

### 5.1 `output_schema` (bukan `output_model` / `response_model`)
Agno v2.8 menggunakan `output_schema=PydanticModel` untuk structured output. Jangan pakai `response_model` (Agno <2.6) atau `output_model` (Agno 2.6–2.7).

```python
# ✅ BENAR
Agent(
    output_schema=ExtractedProfile,
    structured_outputs=False,
)

# ❌ SALAH
Agent(
    output_model=ExtractedProfile,     # error: Agno v2.8 tidak punya parameter ini
    response_model=ExtractedProfile,   # error: parameter sudah dihapus
)
```

### 5.2 `structured_outputs=False` untuk Non-OpenAI
Provider OpenAI-compatible selain OpenAI asli (DeepSeek, Mistral, OpenRouter) umumnya **tidak support** native structured output (`response_format` parameter). Selalu set `structured_outputs=False` untuk fallback ke prompt-based JSON:

```python
Agent(
    output_schema=ExtractedProfile,
    structured_outputs=False,   # prompt-based JSON parsing
)
```

### 5.3 Eksplicit Field Names di Instructions
LLM sering salah mapping field name (e.g. `nama` → `full_name`). Tulis **semua nama field eksak** dari Pydantic schema di agent instructions:

```python
instructions=[
    "Output JSON field: full_name, current_role, years_of_experience, hard_skills (list), ...",
    "GUNAKAN nama field persis seperti di atas (full_name, bukan nama).",
]
```

### 5.4 Handle Pydantic Model Output di Orchestrator
Ketika `structured_outputs=False` dan `output_schema` digunakan, `result.content` bisa berupa:
- **Pydantic model instance** (validasi sukses) → gunakan `.model_dump()`
- **Dict** (validasi sukses di Agno versi tertentu)
- **String** (fallback parsing)

```python
content = result.content if hasattr(result, "content") else result
if hasattr(content, "model_dump"):
    state["confirmed_profile"] = content.model_dump()
elif isinstance(content, dict):
    state["confirmed_profile"] = content
else:
    state["confirmed_profile"] = json.loads(content)
```

### 5.5 Field Validator untuk Null Coercion
Model Pydantic yang dipakai sebagai `output_schema` harus tolerate nilai `null` dari LLM:

```python
@field_validator("budget_idr", "years_of_experience", mode="before")
@classmethod
def coerce_null_to_zero(cls, v):
    return 0.0 if v is None else v
```

## 6. Search Fallback Convention

### 6.1 Job Search Fallback
`search_jobs()` di `vector_store.py` memiliki fallback: bila filter `normalized_role` tidak menghasilkan dokumen, ulangi query tanpa filter (semantic-only). Ini penting karena data lowongan mungkin tidak memiliki `normalized_role` yang cocok dengan target role user.

## 7. E2E & UI Testing

### 7.1 Workflow E2E Test
`apps/agent-api/tests/test_e2e_workflow.py` menjalankan workflow lengkap (tanpa Celery) dengan data CV + form, memverifikasi:
- Profile extraction sukses
- Job retrieval bekerja (dengan fallback)
- Career Blueprint dihasilkan
- Tidak ada error messages

Jalankan:
```bash
uv run --directory apps/agent-api python tests/test_e2e_workflow.py
```

### 7.2 UI Screenshot Test (Playwright)
`scripts/test-ui-screenshots.sh` menggunakan `playwright-cli` untuk mengambil screenshot di setiap tahap UI:

```bash
pnpm --directory apps/agent-frontend run test:screenshot
# atau langsung:
bash scripts/test-ui-screenshots.sh
```

Screenshot disimpan ke `~/pictures/01-home.png` sampai `04-career-blueprint.png`.

## 5. Verification Protocol
Sebelum menganggap sebuah tugas di `TASKS.md` selesai:
1. Jalankan `uv run pytest` di `apps/agent-api` untuk memastikan tidak ada unit test yang break.
2. Jalankan `pnpm build` di `apps/agent-frontend` untuk memastikan tidak ada error TypeScript.
3. Pastikan file baru terintegrasi secara modular (three-layer separation: AI / App / Data, lihat `ARCHITECTURE.md §2`).
4. Perbarui checklist terkait di `TASKS.md` menjadi `[x]`.
5. Verifikasi tidak ada dependensi baru di luar `TECH_STACK.md §1`.
