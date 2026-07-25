from app.core.config import settings

if settings.LANGFUSE_PUBLIC_KEY:
    from langfuse.openai import openai as langfuse_openai
    langfuse_openai.configure(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY,
        host=settings.LANGFUSE_HOST,
    )
