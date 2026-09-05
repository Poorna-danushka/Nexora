from pydantic import BaseModel, Field, field_validator, model_validator


class NoteSummaryResponse(BaseModel):
    note_id: int
    summary: str


class MaterialQuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Question must not be blank.")
        return value.strip()


class MaterialQuestionResponse(BaseModel):
    material_id: int
    answer: str


class StudyPlanRequest(BaseModel):
    subject_ids: list[int] = Field(default_factory=list, max_length=20)
    days: int = Field(default=7, ge=1, le=30)
    minutes_per_day: int = Field(default=60, ge=15, le=480)
    priorities: str | None = Field(default=None, max_length=2000)

    @field_validator("subject_ids")
    @classmethod
    def subject_ids_must_be_positive(cls, value: list[int]) -> list[int]:
        if any(subject_id <= 0 for subject_id in value):
            raise ValueError("Subject IDs must be positive.")
        if len(set(value)) != len(value):
            raise ValueError("Subject IDs must be unique.")
        return value

    @field_validator("priorities")
    @classmethod
    def priorities_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Priorities must not be blank.")
        return value.strip() if value is not None else value


class StudyPlanResponse(BaseModel):
    plan: str


class QuizGenerationRequest(BaseModel):
    subject_id: int | None = Field(default=None, gt=0)
    material_id: int | None = Field(default=None, gt=0)
    question_count: int = Field(default=5, ge=1, le=20)
    topic: str | None = Field(default=None, max_length=500)

    @field_validator("topic")
    @classmethod
    def topic_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Topic must not be blank.")
        return value.strip() if value is not None else value

    @model_validator(mode="after")
    def require_single_source(self):
        if (self.subject_id is None) == (self.material_id is None):
            raise ValueError("Provide exactly one subject_id or material_id.")
        return self


class PracticeQuestionRequest(BaseModel):
    subject_id: int | None = Field(default=None, gt=0)
    material_id: int | None = Field(default=None, gt=0)
    topic: str | None = Field(default=None, max_length=500)

    @field_validator("topic")
    @classmethod
    def topic_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Topic must not be blank.")
        return value.strip() if value is not None else value

    @model_validator(mode="after")
    def require_single_source(self):
        if (self.subject_id is None) == (self.material_id is None):
            raise ValueError("Provide exactly one subject_id or material_id.")
        return self


class GeneratedQuizQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_answer: str = Field(min_length=1, max_length=500)
    explanation: str = Field(min_length=1, max_length=2000)

    @field_validator("question", "correct_answer", "explanation")
    @classmethod
    def generated_text_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Generated quiz text must not be blank.")
        return value.strip()

    @field_validator("options")
    @classmethod
    def options_must_be_valid(cls, value: list[str]) -> list[str]:
        normalized = [option.strip() for option in value]
        if any(not option for option in normalized):
            raise ValueError("Quiz options must not be blank.")
        if len(set(normalized)) != len(normalized):
            raise ValueError("Quiz options must be unique.")
        return normalized

    @model_validator(mode="after")
    def correct_answer_must_be_an_option(self):
        if self.correct_answer not in self.options:
            raise ValueError("The correct answer must match one option.")
        return self


class GeneratedQuizResponse(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    questions: list[GeneratedQuizQuestion] = Field(min_length=1, max_length=20)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Generated quiz title must not be blank.")
        return value.strip()
