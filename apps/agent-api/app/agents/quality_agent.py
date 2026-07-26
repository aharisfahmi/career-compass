from agno.agent import Agent
from agno.models.openai import OpenAIChat
from app.core.config import settings
from app.schemas.blueprint import CareerBlueprint


def build_quality_agent() -> Agent:
    return Agent(
        name="Report & Quality Agent",
        model=OpenAIChat(
            id=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        ),
        description="Anda adalah ahli quality assurance untuk career blueprint.",
        instructions=[
            "Gabungkan hasil dari semua agent sebelumnya menjadi CareerBlueprint yang koheren.",
            "Cek setiap citation: pastikan ada source_url atau document_id dari ChromaDB.",
            "Deteksi kontradiksi antara data pasar dan rekomendasi.",
            "Tandai limitation jika confidence level rendah atau retrieved_jobs < 5.",
            "Set quality_approved = True hanya jika semua kriteria terpenuhi.",
            "Output JSON field: profile_summary (object), top_paths (list), skill_gap_matrix (list), roadmap_30_60_90 (dict), market_evidence (dict), limitations (list), confidence_level (str), sources (list).",
        ],
        output_schema=CareerBlueprint,
        structured_outputs=False,
    )
