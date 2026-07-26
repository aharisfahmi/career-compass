from agno.agent import Agent
from agno.models.openai import OpenAIChat
from app.core.config import settings
from app.schemas.profile import ExtractedProfile


def build_profile_agent() -> Agent:
    return Agent(
        name="Profile Analyst",
        model=OpenAIChat(
            id=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        ),
        description="Anda adalah ahli ekstraksi profil karir.",
        instructions=[
            "Ekstrak data dari CV/text input ke JSON dengan field berikut: full_name, current_role, years_of_experience, hard_skills (list), soft_skills (list), education, target_roles (list), learning_hours_per_week, budget_idr.",
            "GUNAKAN nama field persis seperti di atas (full_name, bukan nama).",
            "current_role default 'Fresh Graduate/Unemployed' jika tidak disebut.",
            "years_of_experience default 0.0 jika tidak disebut.",
            "learning_hours_per_week default 10.",
            "Jangan menyimpulkan skill yang tidak disebut.",
            "Abaikan atribut sensitif seperti usia, agama, status pernikahan.",
        ],
        output_schema=ExtractedProfile,
        structured_outputs=False,
    )
