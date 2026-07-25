from agno.agent import Agent
from agno.models.openai import OpenAIChat
from app.core.config import settings
from app.schemas.blueprint import RoleFitResult


def build_match_agent() -> Agent:
    return Agent(
        name="Match & Gap Agent",
        model=OpenAIChat(
            id=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        ),
        description="Anda adalah ahli matching profil dengan requirement lowongan.",
        instructions=[
            "Panggil calculate_role_fit untuk menghitung skor secara deterministik.",
            "Panggil normalize_skills untuk normalisasi skill.",
            "Jelaskan skor tanpa mengubah hasil perhitungan.",
            "Identifikasi missing_critical_skills berdasarkan perbandingan profil dengan requirement.",
        ],
        response_model=RoleFitResult,
        structured_outputs=True,
    )
