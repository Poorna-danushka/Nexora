import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.study_material import StudyMaterial
from app.models.subject import Subject
from app.models.user import User
from app.schemas.ai import MaterialQuestionRequest, MaterialQuestionResponse
from app.schemas.study_material import StudyMaterialResponse
from app.services.ai import (
    AIConfigurationError,
    AIInputError,
    AIProviderError,
    answer_material_question,
    extract_material_text,
)
from app.services.ai_usage import AIUsageLimitError, execute_with_ai_usage

router = APIRouter(prefix="/study-materials", tags=["study materials"])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
}


def owned_subject(subject_id: int, user: User, db: Session) -> Subject:
    subject = db.query(Subject).filter(
        Subject.id == subject_id, Subject.owner_id == user.id
    ).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found.")
    return subject


def owned_material(material_id: int, user: User, db: Session) -> StudyMaterial:
    material = db.query(StudyMaterial).filter(
        StudyMaterial.id == material_id, StudyMaterial.owner_id == user.id
    ).first()
    if material is None:
        raise HTTPException(status_code=404, detail="Study material not found.")
    return material


@router.post("", response_model=StudyMaterialResponse, status_code=201)
async def upload_material(
    subject_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_subject(subject_id, current_user, db)
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()
    if not re.fullmatch(r"[^<>:\"/\\|?*\x00-\x1f]{1,255}", original_name):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    if extension not in ALLOWED_EXTENSIONS or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type.")

    stored_name = f"{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_DIR / stored_name
    size = 0
    UPLOAD_DIR.mkdir(exist_ok=True)
    try:
        with destination.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise

    material = StudyMaterial(
        owner_id=current_user.id,
        subject_id=subject_id,
        original_filename=original_name,
        stored_filename=stored_name,
        content_type=file.content_type,
        file_size=size,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("", response_model=list[StudyMaterialResponse])
def list_materials(
    subject_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(StudyMaterial).filter(StudyMaterial.owner_id == current_user.id)
    if subject_id is not None:
        query = query.filter(StudyMaterial.subject_id == subject_id)
    return query.order_by(StudyMaterial.created_at.desc()).all()


@router.get("/{material_id}/download")
def download_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = owned_material(material_id, current_user, db)
    path = UPLOAD_DIR / material.stored_filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored file not found.")
    return FileResponse(path, media_type=material.content_type, filename=material.original_filename)


@router.post("/{material_id}/ask", response_model=MaterialQuestionResponse)
def ask_about_material(
    material_id: int,
    data: MaterialQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = owned_material(material_id, current_user, db)
    path = UPLOAD_DIR / material.stored_filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored file not found.")
    try:
        answer = execute_with_ai_usage(
            db,
            current_user.id,
            "study_material_qa",
            lambda: answer_material_question(
                material.original_filename,
                extract_material_text(path, material.content_type),
                data.question,
            ),
        )
    except AIUsageLimitError as exc:
        raise HTTPException(status_code=429, detail="Rolling 24-hour AI request limit reached.") from exc
    except AIInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except AIConfigurationError as exc:
        raise HTTPException(
            status_code=503, detail="AI question answering is not configured."
        ) from exc
    except AIProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to answer questions about this material right now.",
        ) from exc
    return MaterialQuestionResponse(material_id=material.id, answer=answer)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = owned_material(material_id, current_user, db)
    (UPLOAD_DIR / material.stored_filename).unlink(missing_ok=True)
    db.delete(material)
    db.commit()
