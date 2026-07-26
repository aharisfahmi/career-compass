# CareerCompass — AI Career Blueprint Generator

> Sistem AI Agentic untuk membantu *career switcher* & *fresh graduate* menentukan jalur karier berbasis data pasar kerja nyata.

---

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Input CV + Form** | Upload CV (PDF) atau isi manual via form |
| **Ekstraksi Profil** | Ekstrak nama, skill, pengalaman, role target dari CV |
| **Market Intelligence** | Cari lowongan relevan dari database via ChromaDB semantic search |
| **Role Fit Scoring** | Skor deterministik berdasarkan skill match, experience, interest, market evidence |
| **Career Blueprint** | Roadmap 30/60/90 hari + skill gap matrix + sumber belajar |
| **Streaming Events** | Real-time trace agent progress via SSE |

---

## Tech Stack

### Backend (`apps/agent-api`)
- **Runtime:** Python 3.11+ / FastAPI / Uvicorn
- **AI Framework:** Agno (OpenAI SDK fallback)
- **LLM:** DeepSeek V4 Flash via DevScale
- **Vector DB:** ChromaDB (PersistentClient, cosine similarity)
- **Embeddings:** Gemini Embedding 001 (3072-d)
- **Orkestrasi:** Python orchestrator + Agno Agent instances
- **Background:** Celery + Redis
- **Database:** SQLite via SQLModel + Alembic
- **Observability:** Langfuse (OpenTelemetry)

### Frontend (`apps/agent-frontend`)
- **Runtime:** TypeScript / React 19 / Vite
- **Routing:** TanStack Router
- **Data Fetching:** TanStack Query
- **AI Streaming:** AI SDK (`useChat`)
- **Markdown:** `react-markdown`
- **Styling:** Tailwind CSS

### Deployment
- **Backend:** VPS Debian (systemd + Nginx + Certbot)
- **Frontend:** Cloudflare Pages
- **URL:** https://career-compass.ahf.web.id/

---

## Arsitektur Workflow

```
User Input (Form / CV)
    │
    ▼
┌─────────────────┐
│  1. Profile     │  Agno Agent → Ekstraksi profil → ExtractedProfile
│     Analyst     │  Field: nama, role, skill, target_roles, budget
└────────┬────────┘
         ▼
┌─────────────────┐
│  2. Market      │  ChromaDB semantic search → job_postings collection
│     Research    │  Fallback: tanpa filter jika exact match kosong
└────────┬────────┘
         ▼
┌─────────────────┐
│  3. Match       │  Scoring deterministik (bukan LLM!)
│     Engine      │  Skill taxonomy normalization → matching akurat
└────────┬────────┘
         ▼
┌─────────────────┐
│  4. Roadmap     │  Distribusi skill gap ke 30/60/90 hari
│     Builder     │  + learning resources dari ChromaDB
└────────┬────────┘
         ▼
┌─────────────────┐
│  5. Quality     │  Validasi: confidence level, limitations, approval
│     Assurance   │  Revision loop jika tidak lolos QC
└────────┬────────┘
         ▼
   CareerBlueprint JSON → Frontend UI
```

---

## Role Fit Score Formula

Skor dihitung **deterministik** (tanpa LLM) di `app/utils/scoring.py`:

| Komponen | Bobot | Formula |
|----------|-------|---------|
| Skill Match | 40 | `(matched_skills / required_skills) × 40` |
| Experience | 20 | `min(user_exp / required_exp, 1.0) × 20` |
| Interest | 15 | Primary role = 15, lainnya = 5 |
| Constraints | 10 | Default (belum ada data preferensi user) |
| Market Evidence | 15 | `min(retrieved_jobs / 10, 1.0) × 15` |

**Total = 0–100** → Confidence: ≥80 = HIGH, ≥65 = MEDIUM, <65 = LOW

---

## Screenshots

### 1. Halaman Awal — Form Input
![Home](~/pictures/test1-home.png)

Form input profil dengan upload CV dan field manual (nama, posisi, skill, target role, budget).

### 2. Form Terisi
![Form Filled](~/pictures/test2-form-filled.png)

Data dummy: Backend Developer, Golang/PHP, target Golang Developer/PHP Developer/Senior Backend Developer.

### 3. Konfirmasi Profil
![Konfirmasi Profil](~/pictures/test3-konfirmasi-profil.png)

Review data sebelum diproses. Ada tombol "Proses Career Blueprint" dan "Edit Kembali".

### 4. Career Blueprint — Hasil
![Blueprint](~/pictures/test4-career-blueprint.png)

Hasil setelah perbaikan (local):
- Golang Developer: **91/100 (HIGH)** — 7 skill cocok
- PHP Developer: **81/100 (HIGH)** — 7 skill cocok
- Senior Backend Developer: **35/100 (LOW)** — data tidak tersedia
- Missing Skills: Kubernetes, gRPC, RabbitMQ, Laravel
- Roadmap 30/60/90 hari terdistribusi merata

---

## Masalah yang Ditemukan & Diperbaiki

| # | Masalah | Root Cause | Fix |
|---|---------|------------|-----|
| 1 | Semua skor 45/100 identik | ChromaDB kosong (belum di-ingest) + `user_interests` diisi `target_roles` (bug) | Ingest data 180 jobs + ubah interest hanya utk primary role |
| 2 | Missing skills kosong | `required_skills=[]` karena ChromaDB kosong | Ingest data jobs + skill taxonomy normalization |
| 3 | Hanya "30 Hari Pertama" | Slicing sequential: `missing[3:5]` jika len > 3 | Distribusi merata: `missing[::3]`, `[1::3]`, `[2::3]` |
| 4 | Jobs tidak relevan (Python) | Data CSV hanya 8 role, tanpa Golang/PHP | Tambah 60 jobs: Golang, PHP, DevOps, Mobile, dll |
| 5 | URL `example.com` | Data dummy di CSV | Data masih dummy — perlu enrichment via web search |
| 6 | `required_exp_years` hardcoded 2.0 | Tidak pakai data aktual dari job listing | Hitung rata-rata `minimum_experience` dari retrieved jobs |
| 7 | Roadmap target role salah | Pakai `evaluated[0]` (role pertama) | Pakai `max(evaluated, key=total_score)` (skor tertinggi) |
| 8 | Profile LLM campur `current_role` dengan `target_roles` | CV + form digabung tanpa prioritas | Form data override target_roles setelah ekstraksi |
| 9 | "Golang" tidak match dengan "Go" | String matching tanpa normalisasi | Skill taxonomy: "golang" → "Go", "rest apis" → "REST API" |
| 10 | Dim mismatch ChromaDB | Embedding model berubah (Mistral → Gemini) | Update `VECTOR_DIMENSION` ke 3072 + konsistensi env |

---

## Data

### Jobs Database (`data/raw_jobs.csv`)
- **Total:** 180 lowongan (awalnya 120, ditambah 60)
- **Role baru:** Golang Developer, PHP Developer, DevOps Engineer, Mobile Developer, Data Engineer, Full Stack Developer, Java Developer
- **Sumber:** Data sintetis dengan perusahaan Indonesia (Gojek, Traveloka, Shopee, dll)
- **Format:** 17 kolom (id, title, normalized_role, company, required_skills, minimum_experience, salary, dll)

### ChromaDB Collections
| Collection | Isi | Dimensi |
|------------|-----|---------|
| `job_postings` | 180 job documents | 3072 (Gemini) |
| `learning_resources` | Belum di-ingest | — |

---

## Cara Menjalankan

### Backend
```bash
uv run --directory apps/agent-api uvicorn app.main:app --reload
```

### Frontend
```bash
pnpm --directory apps/agent-frontend run dev
```

### Ingest Data
```bash
uv run --directory apps/agent-api python -c "
from app.services.ingest import ingest_jobs
print(ingest_jobs('data/raw_jobs.csv', recreate=True))
"
```

### Test
```bash
# E2E workflow test
uv run --directory apps/agent-api python tests/test_e2e_workflow.py

# UI screenshot test
bash scripts/test-ui-screenshots.sh
```

---

## Catatan Produksi

- Embedding model Gemini `gemini-embedding-001` (free tier: 100 req/min) — untuk produksi perlu upgrade atau ganti provider
- Learning resources belum di-ingest — enrichment via Tavily API sudah dikonfigurasi di `.env`
- Data jobs masih sintetis — perlu diganti dengan data real
- Untuk deploy: pastikan `proxy_buffering off` + `proxy_read_timeout 24h` di Nginx (SSE)
