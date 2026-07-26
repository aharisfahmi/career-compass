from agno.agent import Agent
from agno.models.openai import OpenAIChat
from app.core.config import settings
from app.schemas.blueprint import LearningRoadmap


def build_roadmap_agent() -> Agent:
    return Agent(
        name="Roadmap Planner Agent",
        model=OpenAIChat(
            id=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        ),
        description="Anda adalah ahli perencanaan learning roadmap karir.",
        instructions=[
            "Gunakan tool search_learning_resources untuk mencari materi belajar.",
            "Prioritaskan skill gap yang paling kritis.",
            "Susun roadmap 30/60/90 hari dengan action items konkret.",
            "Sesuaikan dengan jam belajar per minggu dan budget pengguna.",
            "Cantumkan URL sumber belajar yang valid.",
        ],
        output_schema=LearningRoadmap,
        structured_outputs=False,
    )
