#!/usr/bin/env python3
"""Seed demo profiles into SQLite."""
import sys
import os
import json
import asyncio
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "agent-api"))
from app.models import Session
from app.core.config import settings


PROFILES = [
    {
        "id": "demo-001",
        "profile": {
            "full_name": "Rina Amelia",
            "current_role": "Fresh Graduate",
            "years_of_experience": 0,
            "hard_skills": ["Python", "SQL", "Excel"],
            "soft_skills": ["Komunikasi", "Analitis"],
            "education": "S1 Statistika",
            "target_roles": ["Data Analyst"],
            "learning_hours_per_week": 15,
            "budget_idr": 500000,
        },
    },
    {
        "id": "demo-002",
        "profile": {
            "full_name": "Budi Santoso",
            "current_role": "Admin Data",
            "years_of_experience": 1.5,
            "hard_skills": ["Excel", "SQL", "Tableau"],
            "soft_skills": ["Detail-oriented", "Problem Solving"],
            "education": "S1 Manajemen",
            "target_roles": ["Data Analyst", "Business Analyst"],
            "learning_hours_per_week": 10,
            "budget_idr": 300000,
        },
    },
    {
        "id": "demo-003",
        "profile": {
            "full_name": "Citra Dewi",
            "current_role": "Junior Web Developer",
            "years_of_experience": 2,
            "hard_skills": ["React", "JavaScript", "HTML/CSS", "Git"],
            "soft_skills": ["Teamwork", "Adaptability"],
            "education": "S1 Ilmu Komputer",
            "target_roles": ["Frontend Developer"],
            "learning_hours_per_week": 8,
            "budget_idr": 200000,
        },
    },
    {
        "id": "demo-004",
        "profile": {
            "full_name": "Dimas Prayoga",
            "current_role": "IT Support",
            "years_of_experience": 3,
            "hard_skills": ["Python", "PostgreSQL", "Linux", "Docker"],
            "soft_skills": ["Problem Solving", "Komunikasi"],
            "education": "S1 Teknik Informatika",
            "target_roles": ["Python Backend Developer"],
            "learning_hours_per_week": 12,
            "budget_idr": 1000000,
        },
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        for p in PROFILES:
            s = Session(**p)
            session.add(s)
        await session.commit()

    print(f"Seeded {len(PROFILES)} profiles")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
