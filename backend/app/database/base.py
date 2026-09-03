"""
app/database/base.py
--------------------
Central model registry for Alembic.

IMPORTANT: Every SQLAlchemy model file MUST be imported here.

Why this file exists:
  Alembic uses Base.metadata to discover tables and generate migrations.
  Base only knows about a model if that model's file has been imported
  somewhere before Alembic reads Base.metadata.

How to use:
  When you create a new model file, add its import below.
"""

# ── Base class (must be imported first) ──────────────────────────────────────
from app.database.database import Base  # noqa: F401

# ── Models (import every model file here) ────────────────────────────────────
# Phase 1-4: Authentication & User Management
from app.models.user import User  # noqa: F401

# Phase 5: Student Profile (add when implemented)
# from app.models.student_profile import StudentProfile

# Phase 7: Learning Module (add when implemented)
# from app.models.subject import Subject
# from app.models.note import Note
# from app.models.study_material import StudyMaterial

# Phase 8: Study Planning Module (add when implemented)
# from app.models.study_session import StudySession
# from app.models.study_goal import StudyGoal

# Phase 9: Quiz System (add when implemented)
# from app.models.quiz import Quiz
# from app.models.quiz_question import QuizQuestion
# from app.models.quiz_attempt import QuizAttempt
# from app.models.quiz_answer import QuizAnswer

# Phase 10: AI Study Features (add when implemented)
# from app.models.ai_conversation import AIConversation
# from app.models.ai_message import AIMessage

# Phase 12: Notifications (add when implemented)
# from app.models.notification import Notification

# Phase 13: Academic Analytics & Activity History (add when implemented)
# from app.models.activity_log import ActivityLog
