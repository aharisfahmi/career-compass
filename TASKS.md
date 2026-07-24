# Checklist Pengerjaan Proyek KarierKompas (10 Hari Kerja)

## Phase 1: Environment Setup & Data Pipeline (Hari 1 - 3)
- [ ] **Task 1.1**: Inisialisasi environment Python dengan `uv` dan buat file `pyproject.toml` dengan dependencies: `pydantic`, `streamlit`, `langgraph`, `mcp`, `chromadb`, `openai`, `pypdf`, `pandas`, `pytest`.
- [ ] **Task 1.2**: Buat file `data/raw_jobs.csv` yang berisi minimal 120 baris data lowongan terstruktur untuk 6 supported roles.
- [ ] **Task 1.3**: Buat script ETL `app/services/ingest.py` untuk membaca CSV, meng-generate embedding `text-embedding-3-small`, dan menyimpannya ke ChromaDB di `data/chroma_db/`.
- [ ] **Task 1.4**: Buat unit test `tests/test_ingest.py` untuk memverifikasi jumlah dokumen yang tersimpan di ChromaDB.

## Phase 2: FastMCP Server & Utility Tools (Hari 4 - 5)
- [ ] **Task 2.1**: Buat logika scoring deterministik di `app/utils/scoring.py` sesuai spesifikasi `ARCHITECTURE.md`.
- [ ] **Task 2.2**: Inisialisasi FastMCP Server di `app/mcp/server.py`.
- [ ] **Task 2.3**: Buat FastMCP Tools: `search_job_market`, `get_role_skill_stats`, `calculate_role_fit`, dan `search_learning_resources` di `app/mcp/tools.py`.
- [ ] **Task 2.4**: Buat unit test `tests/test_mcp_tools.py` untuk menguji eksekusi semua FastMCP tools.

## Phase 3: Sub-Agents & LangGraph Workflow (Hari 6 - 8)
- [ ] **Task 3.1**: Implementasi `ProfileAnalystAgent` di `app/agents/profile_agent.py` untuk ekstraksi CV dan form.
- [ ] **Task 3.2**: Implementasi `MarketEvidenceAgent` & `MatchAndGapAgent` yang memanggil FastMCP Tools.
- [ ] **Task 3.3**: Implementasi `RoadmapPlannerAgent` di `app/agents/roadmap_agent.py`.
- [ ] **Task 3.4**: Implementasi `ReportQualityAgent` di `app/agents/quality_agent.py` (Validasi sitasi & memicu revisi jika klaim tanpa bukti).
- [ ] **Task 3.5**: Rangkai seluruh Sub-Agent ke dalam LangGraph StateMachine di `app/graph/workflow.py` lengkap dengan *conditional routing*.

## Phase 4: Streamlit UI & Report Downloader (Hari 9)
- [ ] **Task 4.1**: Buat antarmuka input profil & upload CV di `main.py` menggunakan Streamlit.
- [ ] **Task 4.2**: Buat komponen konfirmasi profil hasil ekstraksi sebelum analisis dijalankan.
- [ ] **Task 4.3**: Tampilkan indikator status progres alur LangGraph secara visual di UI.
- [ ] **Task 4.4**: Render tampilan akhir **Career Blueprint** (Skor, Komponen, Skill Gap, Roadmap 30/60/90, dan Sitasi Evidence).
- [ ] **Task 4.5**: Tambahkan tombol unduh laporan dalam format Markdown dan JSON.

## Phase 5: Testing, Evals & Readiness (Hari 10)
- [ ] **Task 5.1**: Jalankan pengujian pada 12 profil sampel sintetis untuk mengukur Latency dan Token Usage.
- [ ] **Task 5.2**: Pastikan tidak ada unhandled exception ketika data lowongan tidak ditemukan (*Low Confidence fallback*).
- [ ] **Task 5.3**: Buat file `.env.example` dan lengkapi `README.md` dengan langkah-langkah demo.
