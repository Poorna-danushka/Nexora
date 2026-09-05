from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import CORS_ORIGINS
from app.database.database import get_db
from app.routers import (
    ai_conversations,
    auth,
    calendar,
    notes,
    subjects,
    study_materials,
    study_planning,
    users,
    quizzes,
)

# ---------------------------------------------------------------------------
# Create the FastAPI application instance
# ---------------------------------------------------------------------------
# title, description, and version appear in the Swagger UI at /docs
app = FastAPI(
    title="Nexora API",
    description="AI-powered student learning and productivity platform for university students.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the Expo / React Native web dev server (and any future origin)
# to call this API. In production, replace "*" with your actual domain(s).
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ---------------------------------------------------------------------------
# Root & Health Check Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to Nexora API"}


@app.get("/health")
def health_check(db=Depends(get_db)):
    """Health check endpoint to verify API operation and DB connection."""
    try:
        # Simple DB ping using raw text execution
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected ({str(e)})"

    return {
        "status": "online",
        "database": db_status,
        "version": "0.1.0"
    }


# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------
# include_router attaches all endpoints defined in the users router to this app.
# Because the router already has prefix="/users", the full paths become:
#   GET  /users/test
#   POST /users
#
# As we add more features (subjects, notes, study planner, quizzes, AI), we will add more routers here.
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(notes.router)
app.include_router(study_materials.router)
app.include_router(study_planning.router)
app.include_router(calendar.router)
app.include_router(quizzes.router)
app.include_router(ai_conversations.router)