from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PhishGuard API"
    ENVIRONMENT: str = "development"
    
    # Database Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "phishguard"
    DB_URL: str | None = None
    
    @property
    def DATABASE_URL(self) -> str:
        if self.DB_URL:
            return self.DB_URL
        import os
        env_url = os.environ.get("DATABASE_URL")
        if env_url:
            return env_url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis / Celery Configuration
    REDIS_HOST: str = "redis"
    REDIS_PORT: str = "6379"
    CELERY_TASK_ALWAYS_EAGER: bool = False

    # JWT Authentication Configuration
    JWT_SECRET_KEY: str = "7d89f81a7b453e9a7e6bdf2c3d5eef128a34b22c7d91e6c382f15b6cd8e9d0a5"  # Standard fallback secret
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AI Phishing Email Generator Configuration
    AI_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    LLAMA_API_URL: str = "http://localhost:11434/v1"
    LLAMA_API_KEY: str = "llama"
    
    # SMTP Configuration
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_SECURE: bool = False
    SMTP_FROM_EMAIL: str = "noreply@phishguard.local"

    # Report File Storage
    REPORTS_DIR: str = "/app/reports"

    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        
    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
