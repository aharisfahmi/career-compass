# Coding Agent Instructions & Guardrails - KarierKompas

## 1. Project Mission & Context
KarierKompas adalah sistem AI Agentic berbasis LangGraph, FastMCP, ChromaDB, dan Streamlit. Aplikasi ini bertujuan membantu career switcher dan fresh graduate menentukan jalur karier berbasis data pasar kerja nyata.

## 2. Strict Negative Constraints (DILARANG KERAS)
- **NO Live Scraping**: DILARANG membuat script scraper live ke LinkedIn, Jobstreet, atau portal lain. Gunakan HANYA data dari `data/raw_jobs.csv` dan ChromaDB.
- **NO LLM-based Scoring**: DILARANG menyerahkan kalkulasi `Role Fit Score` ke LLM. Skor HARUS dihitung oleh fungsi Python deterministik di `app/utils/scoring.py`.
- **NO Hardcoded Credentials**: DILARANG menaruh API Key di dalam kode. Selalu gunakan `os.getenv()` atau `pydantic-settings`.
- **NO Unstructured Agent Output**: Semua komunikasi antar Sub-Agent HARUS menggunakan Pydantic BaseModel (`structured_output`).
- **NO Fabricated Evidence**: DILARANG membuat sitasi/sumber lowongan palsu. Setiap bukti pasar kerja HARUS mencantumkan `document_id` atau `source_url` asli dari ChromaDB.

## 3. Technology Stack & Framework Rules
- **Python**: 3.11+
- **Environment & Package Manager**: `uv` (Astral)
- **Agent Orchestration**: `langgraph`
- **MCP Framework**: `mcp` (FastMCP Python SDK)
- **Vector Database**: `chromadb` dengan embedding `text-embedding-3-small` (via `langchain-openai` atau `openai`)
- **Frontend**: Streamlit (`streamlit`)
- **Validation**: Pydantic v2 (`pydantic>=2.0`)

## 4. Coding Conventions & Quality Standards
- **Type Hints**: Wajib menambahkan type hints pada setiap parameter dan return value fungsi.
- **Docstrings**: Setiap FastMCP tool WAJIB memiliki docstring eksplisit yang menjelaskan *kapan tool harus dipanggil* (When to use).
- **Error Handling**: Semua panggil API eksternal/LLM WAJIB dibungkus blok `try-except` dengan penanganan fallback yang aman.
- **Async vs Sync**: Gunakan fungsi synchronous untuk logika deterministik/scoring, dan asynchronous untuk I/O (ChromaDB, LLM calls, FastMCP).

## 5. Verification Protocol
Sebelum menganggap sebuah tugas di `TASKS.md` selesai:
1. Jalankan `uv run pytest` untuk memastikan tidak ada unit test yang break.
2. Pastikan file baru terintegrasi secara modular di `app/`.
3. Perbarui checklist terkait di `TASKS.md` menjadi `[x]`.
