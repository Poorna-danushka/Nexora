from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.study_session import StudyGoal, StudySession
from app.models.subject import Subject
from app.models.ai_study_plan import AIStudyPlan
from app.models.user import User
from app.schemas.ai import StudyPlanRequest, StudyPlanResponse
from app.schemas.study_planning import (
    StudyGoalCreate,
    StudyGoalResponse,
    StudyGoalUpdate,
    StudySessionCreate,
    StudySessionResponse,
    StudySessionUpdate,
)
from app.services.ai import (
    AIConfigurationError,
    AIInputError,
    AIProviderError,
    generate_study_plan,
)
from app.services.ai_usage import AIUsageLimitError, execute_with_ai_usage

router = APIRouter(tags=["study planning"])


def ensure_subject_owner(subject_id: int | None, user: User, db: Session) -> None:
    if subject_id is not None and not db.query(Subject).filter(
        Subject.id == subject_id, Subject.owner_id == user.id
    ).first():
        raise HTTPException(status_code=404, detail="Subject not found.")


def get_owned(model, item_id: int, user: User, db: Session):
    item = db.query(model).filter(model.id == item_id, model.owner_id == user.id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Planning item not found.")
    return item


@router.post("/study-plans/generate", response_model=StudyPlanResponse)
def generate_plan(
    data: StudyPlanRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subjects = db.query(Subject).filter(Subject.owner_id == user.id)
    if data.subject_ids:
        subjects = subjects.filter(Subject.id.in_(data.subject_ids))
    selected_subjects = subjects.order_by(Subject.name).all()
    if data.subject_ids and len(selected_subjects) != len(data.subject_ids):
        raise HTTPException(status_code=404, detail="Subject not found.")

    goals = db.query(StudyGoal).filter(
        StudyGoal.owner_id == user.id, StudyGoal.is_completed.is_(False)
    ).order_by(StudyGoal.target_date).limit(50).all()
    sessions = db.query(StudySession).filter(
        StudySession.owner_id == user.id, StudySession.is_completed.is_(False)
    ).order_by(StudySession.scheduled_for).limit(50).all()
    subject_context = "\n".join(
        f"- {subject.name}: {subject.progress}% complete"
        for subject in selected_subjects
    )
    goal_context = "\n".join(
        f"- {goal.title} (target: {goal.target_date or 'unspecified'})"
        for goal in goals
    )
    session_context = "\n".join(
        f"- {session.title}: {session.duration_minutes} minutes at {session.scheduled_for}"
        for session in sessions
    )
    try:
        plan = execute_with_ai_usage(
            db,
            user.id,
            "study_plan_generation",
            lambda: generate_study_plan(
                subject_context,
                goal_context,
                session_context,
                data.days,
                data.minutes_per_day,
                data.priorities,
            ),
        )
    except AIUsageLimitError as exc:
        raise HTTPException(status_code=429, detail="Rolling 24-hour AI request limit reached.") from exc
    except AIInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except AIConfigurationError as exc:
        raise HTTPException(
            status_code=503, detail="AI study planning is not configured."
        ) from exc
    except AIProviderError as exc:
        raise HTTPException(
            status_code=502, detail="Unable to generate a study plan right now."
        ) from exc
    saved_plan = AIStudyPlan(
        owner_id=user.id,
        title=f"AI Study Plan ({data.days} days)",
        plan=plan,
        subject_ids=data.subject_ids,
        days=data.days,
        minutes_per_day=data.minutes_per_day,
        priorities=data.priorities,
    )
    db.add(saved_plan)
    db.commit()
    db.refresh(saved_plan)
    return saved_plan


@router.get("/study-plans", response_model=list[StudyPlanResponse])
def list_saved_plans(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(AIStudyPlan).filter(
        AIStudyPlan.owner_id == user.id
    ).order_by(AIStudyPlan.created_at.desc()).all()


@router.get("/study-plans/{plan_id}", response_model=StudyPlanResponse)
def get_saved_plan(
    plan_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(AIStudyPlan).filter(
        AIStudyPlan.id == plan_id,
        AIStudyPlan.owner_id == user.id,
    ).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Study plan not found.")
    return plan


@router.delete("/study-plans/{plan_id}", status_code=204)
def delete_saved_plan(
    plan_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(AIStudyPlan).filter(
        AIStudyPlan.id == plan_id,
        AIStudyPlan.owner_id == user.id,
    ).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Study plan not found.")
    db.delete(plan)
    db.commit()


@router.post("/study-sessions", response_model=StudySessionResponse, status_code=201)
def create_session(data: StudySessionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_subject_owner(data.subject_id, user, db)
    item = StudySession(owner_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/study-sessions", response_model=list[StudySessionResponse])
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(StudySession).filter(StudySession.owner_id == user.id).order_by(StudySession.scheduled_for).all()


@router.patch("/study-sessions/{session_id}", response_model=StudySessionResponse)
def update_session(session_id: int, data: StudySessionUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = get_owned(StudySession, session_id, user, db)
    updates = data.model_dump(exclude_unset=True)
    ensure_subject_owner(updates.get("subject_id"), user, db)
    for field, value in updates.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/study-sessions/{session_id}", status_code=204)
def delete_session(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = get_owned(StudySession, session_id, user, db)
    db.delete(item)
    db.commit()


@router.post("/study-goals", response_model=StudyGoalResponse, status_code=201)
def create_goal(data: StudyGoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_subject_owner(data.subject_id, user, db)
    item = StudyGoal(owner_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/study-goals", response_model=list[StudyGoalResponse])
def list_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(StudyGoal).filter(StudyGoal.owner_id == user.id).order_by(StudyGoal.target_date).all()


@router.patch("/study-goals/{goal_id}", response_model=StudyGoalResponse)
def update_goal(goal_id: int, data: StudyGoalUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = get_owned(StudyGoal, goal_id, user, db)
    updates = data.model_dump(exclude_unset=True)
    ensure_subject_owner(updates.get("subject_id"), user, db)
    for field, value in updates.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/study-goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = get_owned(StudyGoal, goal_id, user, db)
    db.delete(item)
    db.commit()
