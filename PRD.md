# PRD - AI Career Path Optimizer (KarierKompas)

| Informasi | Detail |
|---|---|
| Versi | 1.0 (Final) |
| Status | Approved for Implementation |
| Target Scope | 2 Minggu / MVP |
| Platform | Streamlit Web App |
| Supported Roles | Data Analyst, Business Analyst, Python Backend Developer, QA Engineer, Product Manager, Digital Marketing Specialist |

---

## 1. Executive Summary & Problem Statement
Banyak early-career professional dan career switcher kesulitan menentukan arah karier karena informasi pasar kerja yang tersebar dan saran AI biasa yang sering kali generik tanpa bukti data. 

**KarierKompas** menyelesaikan masalah ini dengan menggabungkan ekstraksi profil pengguna, pencarian lowongan berbasis Vektor (ChromaDB), kalkulasi kecocokan deterministik, dan penyusunan roadmap 30/60/90 hari dalam satu **Career Blueprint** terstruktur.

---

## 2. Core Functional Requirements (P0)

### FR-01: Profile Ingestion & CV Parsing
- Pengguna dapat mengisi form manual ATAU mengunggah CV (PDF/TXT, max 5MB).
- CV diekstrak menggunakan `pypdf` menjadi struktur Pydantic (`ExtractedProfile`).
- Pengguna WAJIB mengonfirmasi/mengedit profil hasil ekstraksi sebelum analisis dijalankan.

### FR-02: Local Vector Database & Job Retrieval
- Menggunakan ChromaDB lokal dengan koleksi `job_postings` (min. 120 dataset lowongan).
- Mendukung semantic search berdasarkan skill, role, dan kualifikasi minimum.

### FR-03: FastMCP Tools & Server
Menyediakan FastMCP Server lokal yang mengekspos 6 tools utama:
1. `search_job_market`: Semantic search lowongan di ChromaDB.
2. `get_role_skill_stats`: Menghitung persentase kemunculan skill di dataset.
3. `normalize_skills`: Mengubah variasi nama skill ke taksonomi standar.
4. `calculate_role_fit`: Menghitung Role Fit Score secara deterministik.
5. `get_salary_benchmark`: Mengambil rentang gaji jika data memadai.
6. `search_learning_resources`: Mencari rekomendasi modul belajar.

### FR-04: Multi-Agent Workflow (LangGraph)
- **Workflow Supervisor**: Mengatur alur dan conditional routing.
- **Profile Analyst Agent**: Menganalisis profil dan transferable skills.
- **Market Evidence Agent**: Mengambil bukti lowongan via MCP Tools.
- **Match & Gap Agent**: Membandingkan profil vs requirement lowongan.
- **Roadmap Planner Agent**: Menyusun rencana aksi 30/60/90 hari.
- **Report & Quality Agent**: Memvalidasi bukti, mendeteksi ketiadaan sitasi, dan memicu revisi (max 1x) jika ada klaim tanpa bukti.

### FR-05: Deterministik Role Fit Score
Skor dihitung murni via Python:
$$\text{Role Fit Score} = (40\% \times \text{Skill Match}) + (20\% \times \text{Experience}) + (15\% \times \text{Interest}) + (10\% \times \text{Constraints}) + (15\% \times \text{Market Evidence})$$

---

## 3. Output Deliverable: Career Blueprint
Output aplikasi berupa laporan terstruktur yang berisi:
1. **Profile Summary**: Skill, pengalaman, dan preferensi pengguna.
2. **Top 3 Career Paths**: Skor kecocokan, kelebihan, hambatan, dan sitasi lowongan.
3. **Skill Gap Matrix**: Skill yang sudah dimiliki vs skill yang harus dipelajari (dengan prioritas).
4. **Roadmap 30/60/90 Hari**: Langkah belajar konkret, estimasi waktu, dan kriteria selesai.
5. **Market Evidence**: Jumlah sampel lowongan yang dianalisis beserta ID/URL sumber.
6. **Limitations & Disclaimer**: Batasan data dan asumsi analisis.

---

## 4. Non-Functional Requirements & Guardrails
- **Latency**: End-to-end pemrosesan maksimal 60 detik.
- **Privacy**: Raw CV tidak disimpan permanen di server.
- **Hallucination Prevention**: Jika dokumen relevan < 5, beri label *Low Confidence*.
- **Export**: Laporan dapat diunduh dalam format Markdown (`.md`) atau JSON.
