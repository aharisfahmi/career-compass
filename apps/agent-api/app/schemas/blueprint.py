from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class MarketEvidence(BaseModel):
    role_name: str
    retrieved_jobs: List[Dict[str, Any]]
    market_stats: Dict[str, Any]
    salary_benchmark: Optional[Dict[str, Any]] = None
    evidence_job_ids: List[str]


class RoleFitResult(BaseModel):
    role_name: str
    total_score: float = Field(ge=0.0, le=100.0)
    confidence_level: str = Field(description="HIGH, MEDIUM, atau LOW")
    score_breakdown: Dict[str, float]
    matching_skills: List[str]
    missing_critical_skills: List[str]
    evidence_job_ids: List[str]
    reasoning_summary: str


class LearningResource(BaseModel):
    title: str
    provider: str
    url: str
    cost_idr: float = 0
    duration_hours: int = 0
    language: str = "id"
    source: str = "chromadb"
    last_verified_at: str = ""


class LearningRoadmap(BaseModel):
    target_role: str
    phase_30_days: List[Dict[str, str]]
    phase_60_days: List[Dict[str, str]]
    phase_90_days: List[Dict[str, str]]
    priority_skills: List[str]
    resources: List[LearningResource]


class CareerBlueprint(BaseModel):
    profile_summary: ExtractedProfile
    top_paths: List[RoleFitResult]
    skill_gap_matrix: List[Dict[str, str]]
    roadmap_30_60_90: Dict[str, List[Dict[str, str]]]
    market_evidence: Dict[str, Any]
    limitations: List[str]
    confidence_level: str
    sources: List[Dict[str, str]]
