import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set in the environment.")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
AI_DAILY_REQUEST_LIMIT = int(os.getenv("AI_DAILY_REQUEST_LIMIT", "20"))
AI_MAX_INPUT_CHARS = int(os.getenv("AI_MAX_INPUT_CHARS", "120000"))
APP_ENV = os.getenv("APP_ENV", "development").lower()
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").lower()
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_CLIENT_EMAIL = os.getenv("FIREBASE_CLIENT_EMAIL")
FIREBASE_PRIVATE_KEY = os.getenv("FIREBASE_PRIVATE_KEY")
NOTIFICATIONS_TEST_ENABLED = os.getenv(
    "NOTIFICATIONS_TEST_ENABLED", "true" if APP_ENV != "production" else "false"
).lower() == "true"
REMINDER_SCHEDULER_ENABLED = os.getenv("REMINDER_SCHEDULER_ENABLED", "false").lower() == "true"
REMINDER_SCHEDULER_INTERVAL_SECONDS = int(
    os.getenv("REMINDER_SCHEDULER_INTERVAL_SECONDS", "30")
)
configured_cors_origins = os.getenv("CORS_ORIGINS")
if configured_cors_origins:
    CORS_ORIGINS = [
        origin.strip()
        for origin in configured_cors_origins.split(",")
        if origin.strip()
    ]
else:
    if APP_ENV == "production":
        raise RuntimeError("CORS_ORIGINS must be set in production.")
    CORS_ORIGINS = [
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:8083",
    ]
