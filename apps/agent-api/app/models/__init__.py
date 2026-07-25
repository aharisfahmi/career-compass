from sqlmodel import SQLModel, Field, Column, JSON, Text
from typing import Optional, Dict, Any


class Session(SQLModel, table=True):
    __tablename__ = "session"

    id: str = Field(primary_key=True)
    profile: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    blueprint: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    status: str = Field(default="pending")
    created_at: Optional[str] = Field(default=None)
