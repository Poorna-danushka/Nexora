from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.study_session import StudyGoal, StudySession
from app.models.subject import Subject
from app.models.user import User
from app.schemas.study_planning import (
    StudyGoalCreate,
    StudyGoalResponse,
    StudyGoalUpdate,
    StudySessionCreate,
    StudySessionResponse,
    StudySessionUpdate,
)

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
