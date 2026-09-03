from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class QuizCreate(BaseModel):
    subject_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=500)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Quiz title must not be blank.")
        return value.strip()


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=500)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("Quiz title must not be blank.")
        return value.strip() if value is not None else value


class QuestionCreate(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    options: list[str] = Field(min_length=2, max_length=8)
    correct_option: int = Field(ge=0)
    position: int = Field(default=0, ge=0)

    @field_validator("prompt")
    @classmethod
    def prompt_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Question prompt must not be blank.")
        return value.strip()

    @model_validator(mode="after")
    def validate_correct(self):
        if self.correct_option >= len(self.options):
            raise ValueError("correct_option must reference an option.")
        return self


class QuestionResponse(QuestionCreate):
    id: int
    quiz_id: int
    model_config = {"from_attributes": True}


class QuizResponse(QuizCreate):
    id: int
    owner_id: int
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    questions: list[QuestionResponse] = Field(default_factory=list)
    model_config = {"from_attributes": True}


class AttemptCreate(BaseModel):
    answers: dict[int, int]

    @field_validator("answers")
    @classmethod
    def answers_are_valid(cls, value: dict[int, int]) -> dict[int, int]:
        if any(question_id <= 0 for question_id in value):
            raise ValueError("Question IDs must be positive.")
        if any(answer < 0 for answer in value.values()):
            raise ValueError("Answers must be non-negative option indexes.")
        return value


class AttemptResponse(BaseModel):
    id: int
    quiz_id: int
    owner_id: int
    score: int
    total: int
    answers: dict[int, int]
    completed_at: datetime
    model_config = {"from_attributes": True}
