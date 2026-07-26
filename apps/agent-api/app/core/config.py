from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OPENAI_API_KEY: str
    OPENAI_BASE_URL: str | None = None
    LLM_MODEL: str = "gpt-4o-mini"

    EMBEDDING_API_KEY: str | None = None
    EMBEDDING_BASE_URL: str | None = None
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    MISTRAL_API_KEY: str
    TAVILY_API_KEY: str | None = None

    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/career_compass.db"

    LANGFUSE_PUBLIC_KEY: str | None = None
    LANGFUSE_SECRET_KEY: str | None = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    CORS_ORIGINS: str = "*"
    CHROMA_DB_PATH: str = "./data/chroma_db"

    @property
    def effective_embedding_api_key(self) -> str:
        return self.EMBEDDING_API_KEY or self.OPENAI_API_KEY

    @property
    def effective_embedding_base_url(self) -> str | None:
        return self.EMBEDDING_BASE_URL or self.OPENAI_BASE_URL


settings = Settings()
