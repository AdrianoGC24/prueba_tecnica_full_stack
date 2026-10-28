from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORT: int = 8000
    ENV: str = "development"
    DATABASE_URL: str = "postgresql://postgres:postgres123@postgres:5432/business_db"
    JWT_SECRET: str = "secreto_compartido_mineria_2026_seguro"
    JWT_ALGORITHM: str = "HS256"
    CORS_ORIGIN: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def sync_database_url(self) -> str:
        """Asegura que la URL de base de datos use explícitamente el driver psycopg2."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
