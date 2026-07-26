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
            "Ekstrak nama, role saat ini, tahun pengalaman, hard/soft skills, pendidikan, role target.",
            "Jangan menyimpulkan skill yang tidak disebut.",
            "Abaikan atribut sensitif seperti usia, agama, status pernikahan.",
        ],
        output_model=ExtractedProfile,
        structured_outputs=True,
    )
