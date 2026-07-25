# Technical Architecture & System Design - CareerCompass

## 0. Reference

- **PRD**: `PRD.md` (final spec)
- **Keputusan tech stack**: `TECH_STACK.md` (single source of truth untuk dependensi)

---

## 1. Monorepo Structure

Mengikuti pola Moon Repo + UV + PNPM (lihat `TECH_STACK.md` §1.13).

```text
career-compass/
├── AGENTS.md
├── PRD.md
├── ARCHITECTURE.md
├── TASKS.md
├── README.md
├── TECH_STACK.md
├── .env.example
├── .moon/
│   └── workspace.yml                # Konfigurasi Moon Repo projects
├── apps/
│   ├── agent-api/                   # Backend FastAPI + Celery + Agno + MCP
│   │   ├── pyproject.toml
│   │   ├── alembic.ini
│   │   ├── alembic/
│   │   │   ├── env.py
│   │   │   └── versions/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── core/
│   │   │   │   ├── config.py        # Pydantic Settings, .env
│   │   │   │   ├── celery_app.py    # Celery + Redis broker
│   │   │   │   ├── session_db.py    # SQLModel + aiosqlite engine
│   │   │   │   └── observability.py # Langfuse init
│   │   │   ├── schemas/             # Pydantic BaseModel (structured output)
│   │   │   │   ├── profile.py
│   │   │   │   ├── job.py
│   │   │   │   └── blueprint.py
│   │   │   ├── utils/               # Logika deterministik
│   │   │   │   ├── cv_parser.py     # Wrapper Mistral OCR
│   │   │   │   ├── skill_taxonomy.py
│   │   │   │   ├── chunker.py       # Chonkie wrapper
│   │   │   │   └── scoring.py       # Formula Role Fit Score (NO LLM)
│   │   │   ├── services/
│   │   │   │   ├── vector_store.py  # ChromaDB PersistentClient
│   │   │   │   ├── ingest.py        # ETL CSV -> ChromaDB (Pandas)
│   │   │   │   └── web_search.py    # Tavily + DuckDuckGo fallback
│   │   │   ├── mcp/
│   │   │   │   ├── server.py        # FastMCP Server
│   │   │   │   └── tools.py         # 6 MCP tools
│   │   │   ├── agents/              # Agno Agent instances
│   │   │   │   ├── profile_agent.py
│   │   │   │   ├── market_agent.py
│   │   │   │   ├── match_agent.py
│   │   │   │   ├── roadmap_agent.py
│   │   │   │   └── quality_agent.py
│   │   │   ├── workflow/            # Python orchestrator (no LangGraph)
│   │   │   │   ├── state.py         # TypedDict shared state
│   │   │   │   ├── orchestrator.py  # Sequential + conditional routing
│   │   │   │   └── tasks.py         # Celery tasks wrapping orchestrator
│   │   │   └── api/
│   │   │       ├── main.py          # FastAPI app + CORS + routes
│   │   │       └── routers/
│   │   │           ├── profile.py
│   │   │           ├── workflow.py  # Submit job + SSE progress
│   │   │           └── session.py
│   │   └── tests/
│   │       ├── test_scoring.py
│   │       ├── test_mcp_tools.py
│   │       ├── test_workflow.py
│   │       └── test_ingest.py
│   └── agent-frontend/              # React + Vite + TanStack Router/Query
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── main.tsx
│           ├── routes/
│           │   ├── __root.tsx
│           │   ├── index.tsx        # Home / profile input
│           │   └── blueprint.$sessionId.tsx
│           ├── components/
│           │   ├── ProfileForm.tsx
│           │   ├── CvUpload.tsx
│           │   ├── WorkflowProgress.tsx   # SSE consumer
│           │   ├── CareerBlueprint.tsx
│           │   └── AgentTrace.tsx
│           ├── hooks/
│           │   ├── useChat.ts            # AI SDK DefaultChatTransport
│           │   └── useWorkflowStream.ts
│           └── lib/
│               ├── api.ts
│               └── types.ts
├── data/
│   ├── raw_jobs.csv                 # Dataset 120+ lowongan
│   ├── learning_resources.json      # Dataset 30+ sumber belajar
│   └── chroma_db/                   # Storage ChromaDB
└── scripts/
    └── seed_db.py                   # Init schema + seed demo profiles
```

---

## 2. Three-Layer Separation (MVVM-ish)

| Layer | Lokasi | Tanggung Jawab |
|---|---|---|
| **AI Layer** | `apps/agent-api/app/agents/`, `workflow/`, `mcp/` | Agno agents, MCP tools, workflow orchestrator, deterministic scoring |
| **App Layer** | `apps/agent-api/app/api/`, `apps/agent-frontend/` | FastAPI REST + SSE, React UI |
| **Data Layer** | `data/`, `apps/agent-api/app/services/`, SQLite, ChromaDB | Persistence, vector store, ETL |

---

## 3. Workflow Orchestration (No LangGraph — Python Orchestrator + Agno)

### 3.1 Shared State (`app/workflow/state.py`)

```python
from typing import TypedDict, List, Dict, Any, Optional

class CareerOptimizerState(TypedDict):
    # Inputs
    raw_cv_text: Optional[str]
    user_input_form: Dict[str, Any]

    # Processed Profile
    confirmed_profile: Dict[str, Any]

    # Retrieval & Evidence
    retrieved_jobs: List[Dict[str, Any]]
    market_stats: Dict[str, Any]

    # Analysis & Scoring
    evaluated_roles: List[Dict[str, Any]]
    skill_gaps: Dict[str, Any]

    # Output & Quality
    roadmap_plan: Dict[str, Any]
    career_blueprint: Dict[str, Any]

    # Execution Metadata
    quality_approved: bool
    revision_count: int
    error_messages: List[str]
    execution_logs: List[Dict[str, Any]]   # agent name, tool, status, duration
```

### 3.2 Orchestrator (`app/workflow/orchestrator.py`)

Routing bersifat **deterministik Python** (bukan LLM). Sesuai PRD §14.1: "Supervisor lebih banyak memakai kode deterministik daripada keputusan LLM."

```python
from agno.agent import Agent
from app.workflow.state import CareerOptimizerState
from app.agents.profile_agent import build_profile_agent
from app.agents.market_agent import build_market_agent
from app.agents.match_agent import build_match_agent
from app.agents.roadmap_agent import build_roadmap_agent
from app.agents.quality_agent import build_quality_agent

MAX_REVISIONS = 1

async def run_workflow(
    initial_state: CareerOptimizerState,
    on_event=None,        # callback for SSE streaming
) -> CareerOptimizerState:
    state = initial_state

    # Step 1: Profile Analyst (loop until user confirms)
    profile_agent: Agent = build_profile_agent()
    state = await _run_agent(profile_agent, state, "profile", on_event)
    # Confirmation handled at API layer (suspend workflow, resume after user OK)

    # Step 2: Market Evidence Agent
    market_agent: Agent = build_market_agent()
    state = await _run_agent(market_agent, state, "market", on_event)

    # Conditional: limited-data fallback
    if len(state.get("retrieved_jobs", [])) < 5:
        state = _apply_limited_data_fallback(state)
        state["execution_logs"].append({"step": "fallback", "status": "applied"})

    # Step 3: Match & Gap Agent
    match_agent: Agent = build_match_agent()
    state = await _run_agent(match_agent, state, "market", on_event)

    # Step 4: Roadmap Planner
    roadmap_agent: Agent = build_roadmap_agent()
    state = await _run_agent(roadmap_agent, state, "roadmap", on_event)

    # Step 5: Report & Quality (with 1 retry)
    quality_agent: Agent = build_quality_agent()
    state = await _run_agent(quality_agent, state, "quality", on_event)

    revision = 0
    while not state["quality_approved"] and revision < MAX_REVISIONS:
        revision += 1
        state["revision_count"] = revision
        # Re-run Roadmap + Quality
        state = await _run_agent(roadmap_agent, state, "roadmap", on_event)
        state = await _run_agent(quality_agent, state, "quality", on_event)

    return state


async def _run_agent(agent: Agent, state, step_name, on_event):
    # Wrap Agno Agent run + emit SSE event
    result = await agent.arun(...)
    # merge result into state
    if on_event:
        await on_event({"type": "step_end", "step": step_name, "status": "ok"})
    return state
```

### 3.3 Conditional Routing Map

| Kondisi | Aksi |
|---|---|
| User belum konfirmasi profil | Suspend workflow, return `pending_confirmation` ke frontend |
| `retrieved_jobs` < 5 dokumen | `Low Confidence` label + fallback roadmap generik |
| Quality check gagal & `revision_count < 1` | Re-run Roadmap + Quality |
| Quality check gagal & `revision_count == 1` | Tandai limitation, return blueprint dengan warning |
| Tool error / timeout | Log error, lanjutkan workflow kecuali critical path |

---

## 4. Agent Definitions (Agno)

Setiap sub-agent adalah instance `agno.agent.Agent` dengan:
- `model` bisa `OpenAIChat`, `MistralChat`, atau via OpenRouter
- `tools` memanggil MCP tools via `MCPServerManager`
- `structured_output` Pydantic BaseModel (lihat §6)

### 4.1 Profile Analyst Agent

**Input**: Form + raw CV text
**Tools**: `_parse_cv` (wrapper Mistral OCR, skip jika hanya form)
**Structured output**: `ExtractedProfile`
**Guardrail**: Tidak menyimpulkan skill yang tidak disebut, abaikan atribut sensitif.

### 4.2 Market Evidence Agent

**Tools**: `search_job_market`, `get_role_skill_stats`, `get_salary_benchmark`
**Structured output**: `MarketEvidence`
**Responsibility**: Ambil lowongan relevan, frekuensi skill, source ID + URL.

### 4.3 Match & Gap Agent

**Tools**: `calculate_role_fit` (deterministik), `normalize_skills`
**Structured output**: `RoleFitResult` (per role)
**Responsibility**: Bandingkan profil vs requirement, panggil scoring tool, jelaskan skor tanpa mengubah hasil.

### 4.4 Roadmap Planner Agent

**Tools**: `search_learning_resources`
**Structured output**: `LearningRoadmap`
**Responsibility**: Prioritas skill gap, susun roadmap 30/60/90 sesuai waktu + anggaran.

### 4.5 Report & Quality Agent

**Tools**: (tidak panggil external, validasi internal)
**Structured output**: `CareerBlueprint`
**Responsibility**: Gabung hasil, cek citation, deteksi kontradiksi, mark revision.

---

## 5. MCP Tools (`app/mcp/tools.py`)

Server: FastMCP (Python `mcp` SDK), transport STDIO untuk lokal.

| Tool | Fungsi | Sumber Data | Output |
|---|---|---|---|
| `search_job_market` | Semantic search lowongan (role, skill, seniority, lokasi) | ChromaDB `job_postings` only | JSON: documents, sources |
| `get_role_skill_stats` | Frekuensi required & preferred skills per role | ChromaDB `job_postings` only | JSON: skill, frequency |
| `normalize_skills` | Variant nama skill → taxonomy standar | `skill_taxonomy.py` (deterministik) | JSON: canonical mapping |
| `calculate_role_fit` | Hitung seluruh komponen Role Fit Score | `scoring.py` (no LLM, no DB) | JSON: total + breakdown |
| `get_salary_benchmark` | Salary range + sample size | ChromaDB `job_postings` only | JSON: min, max, currency, n |
| `search_learning_resources` | Cari resource (skill, biaya, bahasa, durasi) | **Hybrid**: ChromaDB `learning_resources` → Tavily → DuckDuckGo | JSON: list resource |

Setiap tool **wajib**:
- Return structured JSON (bukan teks bebas).
- Docstring eksplisit "When to use" + filter for fetch tools.
- Setiap evidence `document_id` / `source_url` asli — dari ChromaDB untuk jobs, atau URL hasil web search yang verifiable untuk learning resources.

### 5.1 Detail `search_learning_resources` (Hybrid)

Mengikuti pola fallback yang direkomendasikan (`TECH_STACK.md §1.15`):

```python
from app.services.vector_store import get_learning_collection
from app.services.web_search import tavily_search, duckduckgo_fallback
from app.utils.chunker import clean_snippet

LEARNING_DOMAINS = [
    "coursera.org", "udemy.com", "freecodecamp.org",
    "youtube.com", "edx.org", "scrimba.com", "kode.id",
]

def search_learning_resources(
    skills: list[str],
    budget_idr: float = 0.0,
    language: str = "id",
    duration_hours: int | None = None,
    top_k: int = 5,
    fresh: bool = False,
) -> dict:
    """
    When to use: Dipanggil oleh Roadmap Planner Agent untuk mencari materi
    belajar konkret yang sesuai skill gap, anggaran, bahasa, dan durasi user.

    Filter:
      - skills (required): daftar skill target
      - budget_idr: anggaran maksimum dalam Rupiah (0 = gratis saja)
      - language: 'id' | 'en' | 'both'
      - duration_hours: estimasi durasi maksimum
      - fresh: jika True, force web search walaupun ChromaDB punya data
    """
    # Stage 1: ChromaDB (curated, always first)
    curated = _query_learning_chroma(skills, budget_idr, language, top_k)

    results = curated
    needs_enrichment = fresh or len(curated) < top_k
    if not needs_enrichment:
        return _pack_response(results, source="chromadb")

    # Stage 2: Tavily (primary web search)
    try:
        web_results = tavily_search(
            query=_build_query(skills, language),
            include_domains=LEARNING_DOMAINS,
            max_results=top_k * 2,
        )
        results = _merge_dedupe(results, web_results)
    except Exception as e:
        # Stage 3: DuckDuckGo fallback (free, no key)
        web_results = duckduckgo_fallback(
            query=_build_query(skills, language),
            max_results=top_k * 2,
        )
        results = _merge_dedupe(results, web_results)

    # Optional Stage 4: cache hasil baru ke ChromaDB untuk sesi
    _cache_to_chroma(results)

    return _pack_response(results, source="hybrid")
```

**Aturan output:**

```json
{
  "query_skills": ["Python", "SQL"],
  "results": [
    {
      "title": "Python for Data Analysis",
      "provider": "Coursera",
      "url": "https://coursera.org/...",
      "cost_idr": 350000,
      "duration_hours": 40,
      "language": "id",
      "source": "chromadb" | "tavily" | "ddgs",
      "last_verified_at": "2026-07-25"
    }
  ],
  "source_breakdown": { "chromadb": 3, "tavily": 2 }
}
```

### 5.2 Service Layer Web Search (`app/services/web_search.py`)

```python
from tavily import TavilyClient
from ddgs import DDGS
from app.core.config import settings

def tavily_search(query: str, include_domains: list[str], max_results: int = 10) -> list[dict]:
    if not settings.TAVILY_API_KEY:
        raise RuntimeError("TAVILY_API_KEY not configured")
    client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    response = client.search(
        query=query,
        max_results=max_results,
        include_domains=include_domains,
        search_depth="advanced",
    )
    return [
        {
            "title": r["title"],
            "url": r["url"],
            "snippet": r["content"],
            "source": "tavily",
        }
        for r in response.get("results", [])
    ]

def duckduckgo_fallback(query: str, max_results: int = 10) -> list[dict]:
    results = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max_results):
            results.append({
                "title": r["title"],
                "url": r["href"],
                "snippet": r["body"],
                "source": "ddgs",
            })
    return results
```

### 5.3 Mengapa Hybrid Penting untuk Produk Konsumen

| Aspek | ChromaDB Only | Hybrid (Tavily+DDGS) |
|---|---|---|
| Demo stabil | ✅ | ✅ (fallback ChromaDB) |
| URL kursus bisa user verifikasi | ⚠️ Mungkin outdated | ✅ Fresh |
| Tidak sekadar LLM wrapper | ❌ | ✅ |
| Cost kontrol | ✅ | ⚠️ Perlu caching |
| Compliance ToS portal lowongan | ✅ | ✅ (web search ≠ portal scraping) |

Job postings **tetap ChromaDB-only** karena alasan compliance (PRD §3 Non-Goals) dan kestabilan demo.

---

## 6. Pydantic Structured Output (`app/schemas/`)

### `ExtractedProfile` (`schemas/profile.py`)

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class ExtractedProfile(BaseModel):
    full_name: str = Field(description="Nama lengkap pengguna")
    current_role: Optional[str] = Field(default="Fresh Graduate/Unemployed")
    years_of_experience: float = Field(default=0.0)
    hard_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    education: Optional[str] = Field(default=None)
    target_roles: List[str] = Field(default_factory=list)
    learning_hours_per_week: int = Field(default=10)
    budget_idr: float = Field(default=0.0)
```

### `RoleFitResult` (`schemas/blueprint.py`)

```python
from pydantic import BaseModel, Field
from typing import List, Dict

class RoleFitResult(BaseModel):
    role_name: str
    total_score: float = Field(ge=0.0, le=100.0)
    confidence_level: str = Field(description="HIGH, MEDIUM, atau LOW")
    score_breakdown: Dict[str, float]
    matching_skills: List[str]
    missing_critical_skills: List[str]
    evidence_job_ids: List[str]
    reasoning_summary: str
```

### `CareerBlueprint` (`schemas/blueprint.py`)

```python
class CareerBlueprint(BaseModel):
    profile_summary: ExtractedProfile
    top_paths: List[RoleFitResult]
    skill_gap_matrix: List[Dict[str, str]]
    roadmap_30_60_90: Dict[str, List[Dict[str, str]]]
    market_evidence: Dict[str, Any]
    limitations: List[str]
    confidence_level: str
    sources: List[Dict[str, str]]
```

---

## 7. Deterministic Scoring (`app/utils/scoring.py`)

**NO LLM.** Skor dihitung oleh fungsi Python murni (PRD §11 + AGENTS.md §2).

```python
def calculate_role_fit_score(
    user_skills: list[str],
    required_skills: list[str],
    user_exp_years: float,
    required_exp_years: float,
    user_interests: list[str],
    target_role: str,
    retrieved_jobs_count: int,
) -> dict:
    # 1. Skill Match (40%)
    matched_skills = set(user_skills).intersection(set(required_skills))
    skill_score = (len(matched_skills) / max(len(required_skills), 1)) * 40.0

    # 2. Experience Match (20%)
    exp_ratio = min(user_exp_years / max(required_exp_years, 1.0), 1.0)
    exp_score = exp_ratio * 20.0

    # 3. Interest Match (15%)
    interest_score = 15.0 if target_role.lower() in [i.lower() for i in user_interests] else 5.0

    # 4. Constraints Score (10%) - Default full for MVP
    constraint_score = 10.0

    # 5. Market Evidence Score (15%)
    evidence_score = min((retrieved_jobs_count / 10.0), 1.0) * 15.0

    total = round(skill_score + exp_score + interest_score + constraint_score + evidence_score, 2)

    return {
        "total_score": total,
        "breakdown": {
            "skill_match": round(skill_score, 2),
            "experience": round(exp_score, 2),
            "interest": round(interest_score, 2),
            "constraints": round(constraint_score, 2),
            "market_evidence": round(evidence_score, 2),
        },
    }
```

### Score Interpretation (PRD §11)

| Skor | Interpretasi |
|---:|---|
| 80–100 | Strong fit |
| 65–79 | Promising fit |
| 50–64 | Possible with meaningful gaps |
| < 50 | Not recommended for current plan |

---

## 8. CV Parsing via Mistral OCR (`app/utils/cv_parser.py`)

```python
from mistralai import Mistral
from app.core.config import settings

async def parse_cv_pdf(pdf_bytes: bytes) -> str:
    """Ekstrak teks dari PDF (selectable atau scanned) via Mistral OCR."""
    import base64
    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    base64_pdf = base64.b64encode(pdf_bytes).decode()
    response = await client.ocr.process_async(
        model="mistral-ocr-latest",
        document={
            "type": "base64",
            "document": base64_pdf,
        },
        include_image_base64=False,
    )
    # Concatenate text from pages
    return "\n\n".join(page.markdown for page in response.pages)
```

Butuh `MISTRAL_API_KEY` di `.env`. Volume demo kecil → biaya < $1.

---

## 9. Celery + Redis Background Task

### 9.1 Mengapa Async?

PRD §18 NFR: median end-to-end ≤ 60 detik. Workflow lengkap (5 agent + retrieval) bisa > 60 detik bila sinkron. Solusi: jalankan via Celery worker, frontend progress via SSE.

### 9.2 Setup (`app/core/celery_app.py`)

```python
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "career_compass",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.autodiscover_tasks(["app.workflow.tasks"])
```

### 9.3 Task Wrapper (`app/workflow/tasks.py`)

```python
from app.core.celery_app import celery_app
from app.workflow.orchestrator import run_workflow
from app.workflow.state import CareerOptimizerState

@celery_app.task(bind=True, name="run_career_blueprint")
def run_career_blueprint_task(self, initial_state: dict) -> dict:
    import asyncio
    async def _emit(event):
        # Publish progress ke Redis pubsub channel
        from app.core.celery_app import celery_app
        celery_app.backend.client.publish(
            f"workflow:{self.request.id}",
            json.dumps(event),
        )

    state = CareerOptimizerState(**initial_state)
    final_state = asyncio.run(run_workflow(state, on_event=_emit))
    return final_state
```

### 9.4 API SSE (`app/api/routers/workflow.py`)

```python
@router.post("/workflow/submit")
async def submit_workflow(payload: WorkflowSubmit) -> dict:
    task = run_career_blueprint_task.delay(payload.initial_state)
    return {"job_id": task.id, "status": "queued"}

@router.get("/workflow/{job_id}/stream")
async def stream_workflow(job_id: str):
    async def event_generator():
        pubsub = redis.asyncio.Redis.from_url(settings.REDIS_URL)
        await pubsub.subscribe(f"workflow:{job_id}")
        async for msg in pubsub.listen():
            yield f"data: {msg['data'].decode()}\n\n"
            if json.loads(msg['data']).get("type") == "finish":
                break
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### 9.5 Nginx Config (VPS deploy)

Wajib `proxy_buffering off` + `proxy_read_timeout 24h` untuk SSE (lihat `TECH_STACK.md` §1.13).

---

## 10. Persistence (SQLModel + Alembic + SQLite)

### 10.1 Async Engine (`app/core/session_db.py`)

```python
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker

engine = create_async_engine("sqlite+aiosqlite:///./data/career_compass.db")
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
```

### 10.2 Alembic

- `uv run alembic init alembic`
- Set `target_metadata = SQLModel.metadata` di `alembic/env.py`
- Generate: `uv run alembic revision --autogenerate -m "init"`
- Apply: `uv run alembic upgrade head`

---

## 11. ChromaDB Vector Store (`app/services/vector_store.py`)

### 11.1 Collections

| Collection | Isi | Metadata |
|---|---|---|
| `job_postings` | Embedding deskripsi lowongan | id, title, normalized_role, company, location, work_mode, seniority, required_skills, preferred_skills, minimum_experience, salary_min, salary_max, currency, source_url, published_at, collected_at |
| `learning_resources` | Embedding deskripsi kursus | id, title, provider, skills, language, cost, duration, resource_type, url, last_verified_at |

### 11.2 Ingestion Pipeline (`app/services/ingest.py`)

```python
import pandas as pd
from openai import OpenAI
import chromadb
from app.core.config import settings

def ingest_jobs(csv_path: str, chroma_path: str = "data/chroma_db") -> dict:
    df = pd.read_csv(csv_path)
    # Klien embedding dapat berbeda endpoint dari LLM utama (lihat §17.1)
    embed_client = OpenAI(
        api_key=settings.EMBEDDING_API_KEY,
        base_url=settings.EMBEDDING_BASE_URL,
    )
    chroma = chromadb.PersistentClient(path=chroma_path)
    collection = chroma.get_or_create_collection("job_postings")

    for _, row in df.iterrows():
        text = f"{row['title']} | {row['description']}"
        emb = embed_client.embeddings.create(
            input=text, model=settings.EMBEDDING_MODEL,
        ).data[0].embedding

        collection.add(
            ids=[str(row["id"])],
            embeddings=[emb],
            documents=[text],
            metadatas=[row.to_dict()],
        )

    return {"documents_ingested": collection.count()}
```

### 11.3 Thresholding (RAG Best Practice)

- `distance > 1.2` di ChromaDB → ignore (low relevance)
- `top_k` default 10
- Bila hasil retrieval < 5 dokumen → trigger Low Confidence fallback

---

## 12. Observability (`app/core/observability.py`)

### 12.1 Langfuse Init

```python
from langfuse.openai import openai as langfuse_openai
from app.core.config import settings

if settings.LANGFUSE_PUBLIC_KEY:
    langfuse_openai.configure(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY,
        host=settings.LANGFUSE_HOST,
    )
```

### 12.2 Traced Events

| Event | Score Type | Field |
|---|---|---|
| LLM call (agent.arun) | cost + latency + tokens | Auto via OpenTelemetry |
| Tool call (MCP) | success/fail | `execution_logs` |
| Quality check | boolean | `quality_approved` |
| Citation check | boolean per claim | ground truth from ChromaDB |
| Final blueprint | categorical (GOOD/NEEDS_REVIEW/FAIL) | LLM-as-Judge |

### 12.3 Dashboard untuk Presentasi

- **Cost Breakdown** — biaya per run Career Blueprint
- **Latency p50/p95** — end-to-end workflow
- **Token Usage** — per agent + per tool
- **Hallucination rate** — unsupported claim vs total claim (Quality Agent)

---

## 13. Frontend Streaming (React + AI SDK)

### 13.1 Transport

```typescript
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const transport = new DefaultChatTransport({
  api: `${import.meta.env.VITE_API_URL}/workflow/stream`,
});
```

### 13.2 SSE Event Frame Lifecycle

```text
start -> start-step -> text-start/reasoning-start -> delta -> end -> finish-step -> finish -> [DONE]
```

- Setiap part butuh `id` unik (`messageId` vs `textId` vs `reasoningId`).
- `Workflox Progress` komponen render step berdasarkan `start-step` / `finish-step`.
- `AgentTrace` komponen tampilkan `agent name`, `tool`, `status`, `duration` (PRD FR-14).

### 13.3 Markdown Rendering

```typescript
import ReactMarkdown from "react-markdown";

<ReactMarkdown>{part.text}</ReactMarkdown>
```

---

## 14. Security & Privacy

| Aspek | Implementasi |
|---|---|
| API key | Hanya via `.env` + Pydantic Settings, tidak hardcoded |
| PII | Tidak ditulis ke log, tidak dipakai untuk scoring |
| Atribut sensitif | Tidak dipakai (PRD §18 Privacy) |
| Raw CV | Tidak disimpan secara default; hanya teks hasil OCR in-memory untuk sesi |
| Sandbox | Backend di Docker untuk demo & deploy (PRD §21) |
| Approval UI | Untuk mutate tools (Roadmap edit, Report override) via Redis PubSub callback |

---

## 15. Deployment

### 15.1 Local Dev

```bash
# Backend
cd apps/agent-api
uv sync
uv run alembic upgrade head
uv run uvicorn app.api.main:app --reload --port 8000

# Frontend (terminal lain)
cd apps/agent-frontend
pnpm install
pnpm dev
```

### 15.2 Production (VPS Debian)

1. Setup VPS (lihat `TECH_STACK.md` §1.13)
2. Install `uv`, clone repo, `uv sync`
3. Install Redis: `apt install redis-server`
4. Run migrations: `uv run alembic upgrade head`
5. Systemd services:
   - `agentapi.service` → `uvicorn app.api.main:app --host 0.0.0.0 --port 8000`
   - `agentworker.service` → `celery -A app.core.celery_app worker --loglevel=info`
6. Nginx reverse proxy: `proxy_buffering off`, `proxy_read_timeout 24h` (SSE wajib)
7. Certbot: `certbot --nginx -d api.example.com`

### 15.3 Frontend Deploy

```bash
VITE_API_URL=https://api.example.com pnpm build
wrangler pages deploy dist
```

---

## 16. Configuration (`app/core/config.py`)

Single source of truth untuk semua env var. Disediakan pola fallback otomatis untuk endpoint LLM vs embedding.

### 16.1 Pydantic Settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- LLM Endpoint (utama) ---
    OPENAI_API_KEY: str
    OPENAI_BASE_URL: str | None = None          # None = default OpenAI
    LLM_MODEL: str = "gpt-4o-mini"

    # --- Embedding Endpoint (fallback ke OPENAI_* bila kosong) ---
    # Penting: banyak provider OpenAI-compatible tidak support /v1/embeddings.
    # Bila endpoint LLM utama tidak support embedding, set EMBEDDING_*
    # ke provider terpisah (mis. OpenAI asli atau Mistral).
    EMBEDDING_API_KEY: str | None = None
    EMBEDDING_BASE_URL: str | None = None
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # --- Provider Lain ---
    MISTRAL_API_KEY: str                         # wajib untuk CV parsing OCR
    TAVILY_API_KEY: str | None = None            # opsional; kosong → DDGS fallback

    # --- Infra Lokal ---
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/career_compass.db"

    # --- Observability ---
    LANGFUSE_PUBLIC_KEY: str | None = None
    LANGFUSE_SECRET_KEY: str | None = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # --- Computed Properties (fallback cerdas) ---
    @property
    def effective_embedding_api_key(self) -> str:
        return self.EMBEDDING_API_KEY or self.OPENAI_API_KEY

    @property
    def effective_embedding_base_url(self) -> str | None:
        # Kalau EMBEDDING_BASE_URL None, pakai OPENAI_BASE_URL (atau default OpenAI)
        return self.EMBEDDING_BASE_URL or self.OPENAI_BASE_URL


settings = Settings()
```

### 16.2 Skenario Penggunaan

#### Skenario A — Endpoint support LLM + embedding (mis. OpenAI asli)

```ini
OPENAI_API_KEY=sk-proj-xxx
# OPENAI_BASE_URL dikosongkan → pakai default OpenAI
LLM_MODEL=gpt-4o-mini

# EMBEDDING_* dikosongkan → fallback ke OPENAI_*
# Hasil: embedding pakai endpoint yang sama dengan LLM
```

#### Skenario B — Endpoint LLM tidak support embedding (mis. OpenRouter)

```ini
# LLM via OpenRouter (tidak punya /v1/embeddings)
OPENAI_API_KEY=sk-or-v1-xxx
OPENAI_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openrouter/mistral-large-latest

# Embedding via OpenAI asli (terpisah)
EMBEDDING_API_KEY=sk-proj-yyy
# EMBEDDING_BASE_URL dikosongkan → default OpenAI
EMBEDDING_MODEL=text-embedding-3-small
```

#### Skenario C — LLM via custom gateway, embedding via Mistral

```ini
# LLM via custom OpenAI-compatible gateway
OPENAI_API_KEY=my-gateway-key
OPENAI_BASE_URL=https://gateway.internal/v1
LLM_MODEL=custom-model

# Embedding via Mistral (mendukung OpenAI-compatible endpoint)
EMBEDDING_API_KEY=mistral-key
EMBEDDING_BASE_URL=https://api.mistral.ai/v1
EMBEDDING_MODEL=mistral-embed
```

> ⚠️ **Catatan:** Bila `EMBEDDING_MODEL` bukan `text-embedding-3-small`, dimensi vektor bisa berbeda (mis. `mistral-embed` = 1024 dimensi). ChromaDB collection harus dibuat ulang dengan dimensi yang sesuai. Pertahankan satu model embedding sepanjang siklus aplikasi untuk MVP.

### 16.3 Helper untuk Client

```python
from openai import OpenAI
from app.core.config import settings

def get_llm_client() -> OpenAI:
    """LLM client untuk Agno Agent."""
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,   # None jika default OpenAI
    )

def get_embedding_client() -> OpenAI:
    """Embedding client (mungkin beda endpoint dari LLM)."""
    return OpenAI(
        api_key=settings.effective_embedding_api_key,
        base_url=settings.effective_embedding_base_url,
    )
```

---

## 17. Traceability ke PRD

| PRD Section | Lokasi Implementasi |
|---|---|
| FR-01 Profile input | `apps/agent-frontend/src/components/ProfileForm.tsx` |
| FR-02 CV extraction | `apps/agent-api/app/utils/cv_parser.py` (Mistral OCR) |
| FR-04 Job retrieval | `apps/agent-api/app/mcp/tools.py::search_job_market` |
| FR-06 Deterministic scoring | `apps/agent-api/app/utils/scoring.py` |
| FR-11 Quality validation | `apps/agent-api/app/agents/quality_agent.py` |
| FR-13 Workflow visibility | `apps/agent-frontend/src/components/WorkflowProgress.tsx` |
| FR-14 Agent trace | `apps/agent-frontend/src/components/AgentTrace.tsx` + `execution_logs` state |
| §13 Agentic workflow | `apps/agent-api/app/workflow/orchestrator.py` |
| §14 Sub-agents | `apps/agent-api/app/agents/*.py` |
| §15 MCP tools | `apps/agent-api/app/mcp/tools.py` |
| §16 Vector DB | `apps/agent-api/app/services/vector_store.py` + `ingest.py` |
| §17 Base technology | `TECH_STACK.md` §1 |
| §18 NFR (latency, cost) | Langfuse dashboard, Celery async |
| §19 Success metrics | Langfuse scoring + manual eval rubric |
| §20 Evaluation plan | `tests/` + Langfuse datasets |
