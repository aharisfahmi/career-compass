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
