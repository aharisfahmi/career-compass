# Technical Architecture & System Design - KarierKompas

## 1. System Directory Structure
```text
karier-kompas/
├── AGENTS.md
├── PRD.md
├── ARCHITECTURE.md
├── TASKS.md
├── README.md
├── .env.example
├── pyproject.toml
├── data/
│   ├── raw_jobs.csv            # Dataset 120+ lowongan kerja
│   ├── learning_resources.json # Dataset 30+ sumber belajar
│   └── chroma_db/              # Storage biner ChromaDB
├── app/
│   ├── __init__.py
│   ├── config.py               # Pydantic Settings & Env vars
│   ├── schemas/                # Pydantic Schemas
│   │   ├── profile.py
│   │   ├── job.py
│   │   └── blueprint.py
│   ├── utils/                  # Logika Deterministik
│   │   ├── cv_parser.py
│   │   ├── skill_taxonomy.py
│   │   └── scoring.py          # Formula Role Fit Score
│   ├── services/               # Vector DB & Embeddings
│   │   ├── vector_store.py
│   │   └── ingest.py           # Script ETL CSV ke ChromaDB
│   ├── mcp/                    # FastMCP Implementation
│   │   ├── server.py
│   │   └── tools.py
│   ├── agents/                 # Sub-Agents Definitions
│   │   ├── profile_agent.py
│   │   ├── market_agent.py
│   │   ├── match_agent.py
│   │   ├── roadmap_agent.py
│   │   └── quality_agent.py
│   └── graph/                  # LangGraph Workflow Orchestration
│       ├── state.py
│       └── workflow.py
├── main.py                     # Entrypoint Streamlit UI
└── tests/
    ├── test_scoring.py
    ├── test_mcp_tools.py
    └── test_workflow.py
```

---

## 2. LangGraph Shared State Schema (`app/graph/state.py`)

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
    execution_logs: List[Dict[str, Any]]
```

---

## 3. Pydantic Schemas (`app/schemas/`)

### `ExtractedProfile` (`app/schemas/profile.py`)
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

### `RoleFitResult` (`app/schemas/blueprint.py`)
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

---

## 4. Deterministic Scoring Logic (`app/utils/scoring.py`)

```python
def calculate_role_fit_score(
    user_skills: list[str],
    required_skills: list[str],
    user_exp_years: float,
    required_exp_years: float,
    user_interests: list[str],
    target_role: str,
    retrieved_jobs_count: int
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
            "market_evidence": round(evidence_score, 2)
        }
    }
```
