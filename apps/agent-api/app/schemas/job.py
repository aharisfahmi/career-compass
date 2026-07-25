from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class JobPosting(BaseModel):
    id: str
    title: str
    normalized_role: str
    company: str
    location: str
    work_mode: str
    seniority: str
    required_skills: List[str]
    preferred_skills: List[str]
    minimum_experience: int
    salary_min: int
    salary_max: int
    currency: str
    source_url: str
    description: str
