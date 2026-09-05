from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.models.study_material import StudyMaterial
from app.models.subject import Subject
from app.models.user import User
from app.schemas.ai import (
    GeneratedQuizResponse,
    GeneratedQuizQuestion,
    PracticeQuestionRequest,
    QuizExplanationResponse,
    QuizGenerationRequest,
    SaveGeneratedQuizRequest,
)
from app.schemas.quiz import QuizCreate, QuizUpdate, QuizResponse, QuestionCreate, QuestionResponse, AttemptCreate, AttemptResponse
from app.services.ai import (
    AIConfigurationError,
    AIInputError,
    AIProviderError,
    extract_material_text,
    generate_quiz,
    generate_practice_question,
    explain_quiz_question,
)
from app.services.ai_usage import AIUsageLimitError, execute_with_ai_usage

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

def owned_quiz(db: Session, user: User, quiz_id: int) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.owner_id == user.id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found.")
    return quiz


@router.post("/generate", response_model=GeneratedQuizResponse)
def generate_quiz_preview(
    data: QuizGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source_context = _resolve_source_context(data, current_user, db)
    try:
        return execute_with_ai_usage(
            db,
            current_user.id,
            "quiz_generation",
            lambda: generate_quiz(source_context, data.question_count, data.topic),
        )
    except AIUsageLimitError as exc:
        raise HTTPException(429, "Rolling 24-hour AI request limit reached.") from exc
    except AIInputError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except AIConfigurationError as exc:
        raise HTTPException(503, "AI quiz generation is not configured.") from exc
    except AIProviderError as exc:
        raise HTTPException(502, "Unable to generate a quiz right now.") from exc


@router.post("/save-generated", response_model=QuizResponse, status_code=201)
def save_generated_quiz(
    data: SaveGeneratedQuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = db.query(Subject).filter(
        Subject.id == data.subject_id,
        Subject.owner_id == current_user.id,
    ).first()
    if subject is None:
        raise HTTPException(404, "Subject not found.")
    quiz = Quiz(
        owner_id=current_user.id,
        subject_id=subject.id,
        title=data.quiz.title,
        description="Generated with AI",
    )
    db.add(quiz)
    db.flush()
    for position, generated in enumerate(data.quiz.questions):
        correct_option = generated.options.index(generated.correct_answer)
        db.add(QuizQuestion(
            quiz_id=quiz.id,
            prompt=generated.question,
            options=generated.options,
            correct_option=correct_option,
            position=position,
        ))
    db.commit()
    db.refresh(quiz)
    quiz.questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz.id
    ).order_by(QuizQuestion.position, QuizQuestion.id).all()
    return quiz


def _resolve_source_context(
    data: QuizGenerationRequest | PracticeQuestionRequest,
    current_user: User,
    db: Session,
) -> str:
    if data.material_id is not None:
        material = db.query(StudyMaterial).filter(
            StudyMaterial.id == data.material_id,
            StudyMaterial.owner_id == current_user.id,
        ).first()
        if material is None:
            raise HTTPException(404, "Study material not found.")
        path = Path(__file__).resolve().parents[2] / "uploads" / material.stored_filename
        if not path.is_file():
            raise HTTPException(404, "Stored file not found.")
        try:
            return extract_material_text(path, material.content_type)
        except AIInputError as exc:
            raise HTTPException(422, detail=str(exc)) from exc

    subject = db.query(Subject).filter(
        Subject.id == data.subject_id,
        Subject.owner_id == current_user.id,
    ).first()
    if subject is None:
        raise HTTPException(404, "Subject not found.")
    return (
        f"Subject: {subject.name}\n"
        f"Description: {subject.description or 'No description'}\n"
        f"Progress: {subject.progress}%"
    )


@router.post("/generate-question", response_model=GeneratedQuizQuestion)
def generate_practice_question_preview(
    data: PracticeQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source_context = _resolve_source_context(data, current_user, db)
    try:
        result = execute_with_ai_usage(
            db,
            current_user.id,
            "practice_question_generation",
            lambda: generate_practice_question(source_context, data.topic),
        )
    except AIUsageLimitError as exc:
        raise HTTPException(429, "Rolling 24-hour AI request limit reached.") from exc
    except AIInputError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except AIConfigurationError as exc:
        raise HTTPException(503, "AI question generation is not configured.") from exc
    except AIProviderError as exc:
        raise HTTPException(502, "Unable to generate a practice question right now.") from exc
    return result.questions[0]


@router.post(
    "/{quiz_id}/questions/{question_id}/explain",
    response_model=QuizExplanationResponse,
)
def explain_owned_quiz_question(
    quiz_id: int,
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quiz = owned_quiz(db, current_user, quiz_id)
    question = db.query(QuizQuestion).filter(
        QuizQuestion.id == question_id,
        QuizQuestion.quiz_id == quiz.id,
    ).first()
    if question is None:
        raise HTTPException(404, "Question not found.")
    try:
        explanation = execute_with_ai_usage(
            db,
            current_user.id,
            "quiz_question_explanation",
            lambda: explain_quiz_question(
                quiz.title,
                question.prompt,
                question.options,
                question.correct_option,
            ),
        )
    except AIUsageLimitError as exc:
        raise HTTPException(429, "Rolling 24-hour AI request limit reached.") from exc
    except AIInputError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except AIConfigurationError as exc:
        raise HTTPException(503, "AI explanation is not configured.") from exc
    except AIProviderError as exc:
        raise HTTPException(502, "Unable to explain this question right now.") from exc
    return QuizExplanationResponse(
        quiz_id=quiz.id,
        question_id=question.id,
        explanation=explanation,
    )

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
