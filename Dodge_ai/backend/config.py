from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_USERNAME: str = ""
    NEO4J_PASSWORD: str = "password"
    NEO4J_DATABASE: str = ""

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    XAI_API_KEY: str = ""
    XAI_MODEL: str = ""
    XAI_BASE_URL: str = ""

    DATA_DIR: str = "./data/sap-o2c-data"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"

    @property
    def neo4j_user(self) -> str:
        return self.NEO4J_USERNAME or self.NEO4J_USER

    @property
    def llm_api_key(self) -> str:
        return self.GROQ_API_KEY or self.XAI_API_KEY

    @property
    def llm_model(self) -> str:
        return self.GROQ_MODEL or self.XAI_MODEL or "llama-3.3-70b-versatile"

    @property
    def llm_base_url(self) -> str:
        return self.GROQ_BASE_URL or self.XAI_BASE_URL or "https://api.groq.com/openai/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def resolve_data_dir(path_value: str) -> Path:
    raw_path = Path(path_value)
    if raw_path.is_absolute():
        return raw_path

    backend_dir = Path(__file__).resolve().parent
    folder_name = raw_path.name
    candidates = [
        Path.cwd() / raw_path,
        backend_dir / raw_path,
        backend_dir.parent / raw_path,
        Path.cwd() / folder_name,
        backend_dir.parent / folder_name,
    ]

    def has_data_files(candidate: Path) -> bool:
        if not candidate.exists():
            return False
        for pattern in ("*.csv", "*.parquet", "*.jsonl"):
            if any(candidate.rglob(pattern)):
                return True
        return False

    for candidate in candidates:
        if has_data_files(candidate):
            return candidate

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]
