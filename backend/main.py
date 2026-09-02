from fastapi import FastAPI

from app.routers import users

# ---------------------------------------------------------------------------
# Create the FastAPI application instance
# ---------------------------------------------------------------------------
# title, description, and version appear in the Swagger UI at /docs
app = FastAPI(
    title="Nexora API",
    description="AI-powered platform for university students — learning, skills, and career.",
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to Nexora API"}


# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------
# include_router attaches all endpoints defined in the users router to this app.
# Because the router already has prefix="/users", the full paths become:
#   GET  /users/test
#   POST /users
#
# As we add more features (courses, jobs, CV, AI), we will add more routers here.
app.include_router(users.router)