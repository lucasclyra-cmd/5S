from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./fives.db"
    DATABASE_URL_SYNC: str = "sqlite:///./fives.db"
    OPENAI_API_KEY: str = ""
    STORAGE_PATH: str = "./storage"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
