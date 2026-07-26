from pydantic import BaseModel, Field, field_validator
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

    @field_validator("budget_idr", mode="before")
    @classmethod
    def coerce_budget(cls, v):
        return 0.0 if v is None else v

    @field_validator("years_of_experience", mode="before")
    @classmethod
    def coerce_exp(cls, v):
        return 0.0 if v is None else v
