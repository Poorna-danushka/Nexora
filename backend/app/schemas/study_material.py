from datetime import datetime

from pydantic import BaseModel


class StudyMaterialResponse(BaseModel):
    id: int
    owner_id: int
    subject_id: int
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime

    model_config = {"from_attributes": True}
