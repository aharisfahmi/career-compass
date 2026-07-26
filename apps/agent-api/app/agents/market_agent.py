from agno.agent import Agent
from agno.models.openai import OpenAIChat
from app.core.config import settings
from app.schemas.blueprint import MarketEvidence
from app.schemas.profile import ExtractedProfile


def build_market_agent() -> Agent:
    return Agent(
        name="Market Evidence Agent",
        model=OpenAIChat(
            id=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        ),
        description="Anda adalah ahli riset pasar kerja.",
        instructions=[
            "Gunakan tool search_job_market untuk mencari lowongan relevan berdasarkan profil pengguna.",
            "Gunakan tool get_role_skill_stats untuk statistik skill.",
            "Gunakan tool get_salary_benchmark untuk data gaji.",
            "Output harus menyertakan evidence_job_ids dari ChromaDB.",
            "Jangan membuat data lowongan palsu.",
        ],
        output_model=MarketEvidence,
        structured_outputs=True,
    )
