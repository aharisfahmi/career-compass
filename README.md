# CareerCompass 🧭 - AI Career Path Optimizer

CareerCompass is a **Multi-Agent System** and **MCP (Model Context Protocol)** based application that helps career switchers and fresh graduates discover the most realistic career paths through real labor market data analysis.

---

## 🌟 Key Features
1. **CV & Profile Parser**: Structured profile extraction from PDF/TXT documents.
2. **Local Vector Search (ChromaDB)**: Semantic search across a curated dataset of 120+ job listings.
3. **FastMCP Server**: Standardized external tool integration for labor market analysis.
4. **Deterministic Role Fit Scoring**: Hallucination-free match scoring powered by pure Python algorithms.
5. **Quality Gate Agent**: Validation agent that ensures every recommendation claim is backed by job listing evidence citations.
6. **Career Blueprint**: Structured output containing fit analysis, skill gaps, and a 30/60/90-day roadmap.

---

## 🏗️ System Architecture

```
[ User Input / CV ]
        │
        ▼
[ Profile Analyst Agent ] ──( Confirmation )──► [ Market Evidence Agent ]
                                                        │ ( FastMCP Tools )
                                                        ▼
[ Career Blueprint ] ◄── [ Quality Agent ] ◄── [ Match & Roadmap Agents ]
```

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites
- Python 3.11 or newer
- `uv` package manager (`curl -sSf https://astral.sh/uv/install.sh | sh`)

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/username/karier-kompas.git
cd karier-kompas
uv sync
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your OpenAI API Key:
```bash
cp .env.example .env
```
Populate the `.env` file:
```ini
OPENAI_API_KEY=sk-proj-your-openai-key-here
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o-mini
```

### 4. Ingest Dataset into ChromaDB
Run the ETL script below to build a local Vector DB from the CSV file:
```bash
uv run python app/services/ingest.py
```

---

## 🖥️ Running the Application

Launch the Streamlit app with the following command:
```bash
uv run streamlit run main.py
```
The application will automatically open in your browser at `http://localhost:8501`.

---

## 🧪 Unit Testing & Evals

Run the automated test suite with `pytest`:
```bash
uv run pytest
```

---

## 📄 Final Assignment Requirements Compliance

| Requirement | Status | Code Location |
|---|---|---|
| **PRD** | ✅ Done | `PRD.md` |
| **Agentic Workflow** | ✅ Done | `app/graph/workflow.py` (LangGraph) |
| **Sub-Agents** | ✅ Done (5 Agents) | `app/agents/` |
| **MCP Tools** | ✅ Done | `app/mcp/tools.py` (FastMCP) |
| **Vector DB & Embeddings** | ✅ Done | `app/services/vector_store.py` (ChromaDB) |
| **Deterministic Scoring** | ✅ Done | `app/utils/scoring.py` |
