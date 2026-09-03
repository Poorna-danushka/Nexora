from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.models.subject import Subject
from app.models.user import User
from app.schemas.quiz import QuizCreate, QuizUpdate, QuizResponse, QuestionCreate, QuestionResponse, AttemptCreate, AttemptResponse

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

def owned_quiz(db: Session, user: User, quiz_id: int) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.owner_id == user.id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found.")
    return quiz

@router.post("", response_model=QuizResponse, status_code=201)
def create_quiz(data: QuizCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.subject_id, Subject.owner_id == current_user.id).first()
    if not subject:
        raise HTTPException(404, "Subject not found.")
    quiz = Quiz(owner_id=current_user.id, **data.model_dump())
    db.add(quiz); db.commit(); db.refresh(quiz)
    return quiz

@router.get("", response_model=list[QuizResponse])
def list_quizzes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Quiz).filter(Quiz.owner_id == current_user.id).order_by(Quiz.created_at.desc()).all()

@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = owned_quiz(db, current_user, quiz_id)
    quiz.questions = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.position, QuizQuestion.id)
        .all()
    )
    return quiz


@router.get("/{quiz_id}/questions", response_model=list[QuestionResponse])
def list_questions(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_quiz(db, current_user, quiz_id)
    return (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz_id)
        .order_by(QuizQuestion.position, QuizQuestion.id)
        .all()
    )


@router.patch("/{quiz_id}", response_model=QuizResponse)
def update_quiz(quiz_id: int, data: QuizUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = owned_quiz(db, current_user, quiz_id)
    for field, value in data.model_dump(exclude_unset=True).items(): setattr(quiz, field, value)
    db.commit(); db.refresh(quiz); return quiz

@router.delete("/{quiz_id}", status_code=204)
def delete_quiz(quiz_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(owned_quiz(db, current_user, quiz_id)); db.commit()

@router.post("/{quiz_id}/questions", response_model=QuestionResponse, status_code=201)
def add_question(quiz_id: int, data: QuestionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_quiz(db, current_user, quiz_id)
    question = QuizQuestion(quiz_id=quiz_id, **data.model_dump())
    db.add(question); db.commit(); db.refresh(question); return question

@router.patch("/{quiz_id}/questions/{question_id}", response_model=QuestionResponse)
def update_question(quiz_id: int, question_id: int, data: QuestionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_quiz(db, current_user, quiz_id)
    q = db.query(QuizQuestion).filter(QuizQuestion.id == question_id, QuizQuestion.quiz_id == quiz_id).first()
    if not q: raise HTTPException(404, "Question not found.")
    for field, value in data.model_dump().items(): setattr(q, field, value)
    db.commit(); db.refresh(q); return q

@router.delete("/{quiz_id}/questions/{question_id}", status_code=204)
def delete_question(quiz_id: int, question_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_quiz(db, current_user, quiz_id)
    q = db.query(QuizQuestion).filter(QuizQuestion.id == question_id, QuizQuestion.quiz_id == quiz_id).first()
    if not q: raise HTTPException(404, "Question not found.")
    db.delete(q); db.commit()

@router.post("/{quiz_id}/attempts", response_model=AttemptResponse, status_code=201)
def submit_attempt(quiz_id: int, data: AttemptCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = owned_quiz(db, current_user, quiz_id)
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    if not questions: raise HTTPException(400, "Quiz has no questions.")
    valid_ids = {q.id for q in questions}
    if any(qid not in valid_ids for qid in data.answers):
        raise HTTPException(422, "Unknown question.")
    if any(
        qid in data.answers and data.answers[qid] >= len(q.options)
        for q in questions
        for qid in [q.id]
    ):
        raise HTTPException(422, "Answer option is out of range.")
    score = sum(1 for q in questions if data.answers.get(q.id) == q.correct_option)
    attempt = QuizAttempt(quiz_id=quiz_id, owner_id=current_user.id, score=score, total=len(questions), answers=data.answers)
    db.add(attempt); db.commit(); db.refresh(attempt); return attempt

@router.get("/{quiz_id}/attempts", response_model=list[AttemptResponse])
def attempt_history(quiz_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_quiz(db, current_user, quiz_id)
    return db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.owner_id == current_user.id).order_by(QuizAttempt.completed_at.desc()).all()
