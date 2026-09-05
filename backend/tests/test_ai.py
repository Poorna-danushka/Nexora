import httpx
import pytest

from app.services import ai
from app.models.ai_usage import AIUsage
from tests.test_users import _auth_headers


def test_note_summarization_returns_summary_for_owner(client, monkeypatch):
    headers = _auth_headers(client, "summary-owner@university.edu", "Summary Owner")
    subject = client.post("/subjects", json={"name": "History"}, headers=headers).json()
    note = client.post(
        "/notes",
        json={
            "subject_id": subject["id"],
            "title": "The Roman Republic",
            "content": "The Roman Republic developed representative institutions.",
        },
        headers=headers,
    ).json()

    monkeypatch.setattr(
        "app.routers.notes.summarize_note",
        lambda title, content: "The note explains the Roman Republic.",
    )
    response = client.post(f"/notes/{note['id']}/summarize", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "note_id": note["id"],
        "summary": "The note explains the Roman Republic.",
    }


def test_note_summarization_hides_notes_from_other_users(client, monkeypatch):
    owner_headers = _auth_headers(
        client, "summary-owner-2@university.edu", "Summary Owner 2"
    )
    other_headers = _auth_headers(
        client, "summary-other@university.edu", "Summary Other"
    )
    subject = client.post("/subjects", json={"name": "Biology"}, headers=owner_headers).json()
    note = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Cells", "content": "Cell basics."},
        headers=owner_headers,
    ).json()

    monkeypatch.setattr(
        "app.routers.notes.summarize_note",
        lambda title, content: pytest.fail("The provider must not be called."),
    )
    response = client.post(
        f"/notes/{note['id']}/summarize",
        headers=other_headers,
    )

    assert response.status_code == 404


def test_note_summarization_requires_authentication(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.notes.summarize_note",
        lambda title, content: pytest.fail("The provider must not be called."),
    )

    response = client.post("/notes/1/summarize")

    assert response.status_code == 401


def test_note_summarization_maps_provider_failures(client, monkeypatch):
    headers = _auth_headers(
        client, "summary-provider-error@university.edu", "Summary Provider Error"
    )
    subject = client.post("/subjects", json={"name": "Physics"}, headers=headers).json()
    note = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Motion", "content": "Velocity changes."},
        headers=headers,
    ).json()

    def fail_summary(title, content):
        raise ai.AIProviderError("provider unavailable")

    monkeypatch.setattr("app.routers.notes.summarize_note", fail_summary)
    response = client.post(f"/notes/{note['id']}/summarize", headers=headers)

    assert response.status_code == 502
    assert response.json()["detail"] == "Unable to summarize note right now."


def test_summarize_note_calls_openai_and_parses_response(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "A concise summary."}}]}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return FakeResponse()

    monkeypatch.setattr(ai, "OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr(ai.httpx, "post", fake_post)

    assert ai.summarize_note("Study title", "Study content") == "A concise summary."
    assert captured["kwargs"]["headers"]["Authorization"] == "Bearer test-openai-key"
    assert captured["kwargs"]["json"]["messages"][1]["content"] == (
        "Note title: Study title\n\nNote content:\nStudy content"
    )


def test_summarize_note_requires_api_key(monkeypatch):
    monkeypatch.setattr(ai, "OPENAI_API_KEY", None)

    with pytest.raises(ai.AIConfigurationError):
        ai.summarize_note("Title", "Content")


def test_summarize_note_maps_http_failures(monkeypatch):
    def fake_post(url, **kwargs):
        raise httpx.ConnectError("connection failed")

    monkeypatch.setattr(ai, "OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr(ai.httpx, "post", fake_post)

    with pytest.raises(ai.AIProviderError):
        ai.summarize_note("Title", "Content")


def test_note_summarization_logs_success(client, monkeypatch, db):
    headers = _auth_headers(client, "usage-success@university.edu", "Usage Success")
    subject = client.post("/subjects", json={"name": "History"}, headers=headers).json()
    note = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Topic", "content": "Facts."},
        headers=headers,
    ).json()
    monkeypatch.setattr("app.routers.notes.summarize_note", lambda *args: "Summary")

    response = client.post(f"/notes/{note['id']}/summarize", headers=headers)

    assert response.status_code == 200
    usage = db.query(AIUsage).filter(AIUsage.feature == "note_summarization").one()
    assert usage.success is True
    assert usage.provider_input_tokens is None


def test_ai_usage_records_provider_token_counts(client, monkeypatch, db):
    headers = _auth_headers(client, "usage-tokens@university.edu", "Usage Tokens")
    subject = client.post("/subjects", json={"name": "Physics"}, headers=headers).json()
    note = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Motion", "content": "Velocity."},
        headers=headers,
    ).json()

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [{"message": {"content": "Summary"}}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 7},
            }

    monkeypatch.setattr("app.services.ai.OPENAI_API_KEY", "test-key")
    monkeypatch.setattr("app.services.ai.httpx", type("FakeHTTP", (), {"post": staticmethod(lambda *args, **kwargs: FakeResponse())}))

    response = client.post(f"/notes/{note['id']}/summarize", headers=headers)

    assert response.status_code == 200
    usage = db.query(AIUsage).filter(AIUsage.feature == "note_summarization").one()
    assert usage.provider_input_tokens == 12
    assert usage.provider_output_tokens == 7


def test_ai_limit_is_per_user_and_blocks_after_limit(client, monkeypatch, db):
    import app.services.ai_usage as usage_service

    headers = _auth_headers(client, "usage-limit@university.edu", "Usage Limit")
    other_headers = _auth_headers(client, "usage-other@university.edu", "Usage Other")
    subject = client.post("/subjects", json={"name": "Math"}, headers=headers).json()
    other_subject = client.post(
        "/subjects", json={"name": "Science"}, headers=other_headers
    ).json()
    note = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Math", "content": "Facts."},
        headers=headers,
    ).json()
    other_note = client.post(
        "/notes",
        json={"subject_id": other_subject["id"], "title": "Science", "content": "Facts."},
        headers=other_headers,
    ).json()
    monkeypatch.setattr("app.routers.notes.summarize_note", lambda *args: "Summary")
    monkeypatch.setattr(usage_service, "AI_DAILY_REQUEST_LIMIT", 1)

    assert client.post(f"/notes/{note['id']}/summarize", headers=headers).status_code == 200
    assert client.post(f"/notes/{note['id']}/summarize", headers=headers).status_code == 429
    assert client.post(
        f"/notes/{other_note['id']}/summarize", headers=other_headers
    ).status_code == 200


def test_ai_input_size_is_rejected_without_provider_call(client, monkeypatch):
    headers = _auth_headers(client, "usage-input@university.edu", "Usage Input")
    subject = client.post("/subjects", json={"name": "Input"}, headers=headers).json()
    note = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Input", "content": "Facts."},
        headers=headers,
    ).json()
    monkeypatch.setattr("app.services.ai.AI_MAX_INPUT_CHARS", 3)
    monkeypatch.setattr(
        "app.services.ai._request_completion",
        lambda *args: pytest.fail("The provider must not be called."),
    )

    response = client.post(f"/notes/{note['id']}/summarize", headers=headers)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "provider_data",
    [
        {"choices": []},
        {"choices": [{"message": {}}]},
        {"choices": [{"message": {"content": "   "}}]},
    ],
)
def test_summarize_note_rejects_malformed_provider_responses(
    monkeypatch, provider_data
):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return provider_data

    monkeypatch.setattr(ai, "OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr(ai.httpx, "post", lambda url, **kwargs: FakeResponse())

    with pytest.raises(ai.AIProviderError):
        ai.summarize_note("Title", "Content")


def test_material_question_answers_for_owner(client, monkeypatch):
    headers = _auth_headers(client, "material-qa-owner@university.edu", "Material QA Owner")
    subject = client.post("/subjects", json={"name": "Networking"}, headers=headers).json()
    upload = client.post(
        f"/study-materials?subject_id={subject['id']}",
        files={"file": ("lecture.txt", b"TCP uses a handshake.", "text/plain")},
        headers=headers,
    )
    material = upload.json()

    monkeypatch.setattr(
        "app.routers.study_materials.extract_material_text",
        lambda path, content_type: "TCP uses a handshake.",
    )
    monkeypatch.setattr(
        "app.routers.study_materials.answer_material_question",
        lambda filename, source_text, question: "TCP uses a handshake.",
    )
    response = client.post(
        f"/study-materials/{material['id']}/ask",
        json={"question": "How does TCP start communication?"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "material_id": material["id"],
        "answer": "TCP uses a handshake.",
    }
    client.delete(f"/study-materials/{material['id']}", headers=headers)


def test_material_question_is_owner_scoped_and_does_not_call_provider(client, monkeypatch):
    owner_headers = _auth_headers(
        client, "material-qa-owner-2@university.edu", "Material QA Owner 2"
    )
    other_headers = _auth_headers(
        client, "material-qa-other@university.edu", "Material QA Other"
    )
    subject = client.post("/subjects", json={"name": "Biology"}, headers=owner_headers).json()
    material = client.post(
        f"/study-materials?subject_id={subject['id']}",
        files={"file": ("cells.txt", b"Cells divide.", "text/plain")},
        headers=owner_headers,
    ).json()
    monkeypatch.setattr(
        "app.routers.study_materials.answer_material_question",
        lambda *args: pytest.fail("The provider must not be called."),
    )

    response = client.post(
        f"/study-materials/{material['id']}/ask",
        json={"question": "What happens?"},
        headers=other_headers,
    )

    assert response.status_code == 404
    client.delete(f"/study-materials/{material['id']}", headers=owner_headers)


def test_material_question_requires_authentication(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.study_materials.answer_material_question",
        lambda *args: pytest.fail("The provider must not be called."),
    )

    response = client.post("/study-materials/1/ask", json={"question": "What is this?"})

    assert response.status_code == 401


def test_material_question_maps_provider_failure(client, monkeypatch):
    headers = _auth_headers(
        client, "material-qa-provider@university.edu", "Material QA Provider"
    )
    subject = client.post("/subjects", json={"name": "Chemistry"}, headers=headers).json()
    material = client.post(
        f"/study-materials?subject_id={subject['id']}",
        files={"file": ("chemistry.txt", b"Atoms have nuclei.", "text/plain")},
        headers=headers,
    ).json()
    monkeypatch.setattr(
        "app.routers.study_materials.extract_material_text",
        lambda path, content_type: "Atoms have nuclei.",
    )
    monkeypatch.setattr(
        "app.routers.study_materials.answer_material_question",
        lambda *args: (_ for _ in ()).throw(ai.AIProviderError("unavailable")),
    )

    response = client.post(
        f"/study-materials/{material['id']}/ask",
        json={"question": "What do atoms have?"},
        headers=headers,
    )

    assert response.status_code == 502
    client.delete(f"/study-materials/{material['id']}", headers=headers)


def test_material_question_maps_missing_api_key(client, monkeypatch):
    headers = _auth_headers(
        client, "material-qa-config@university.edu", "Material QA Config"
    )
    subject = client.post("/subjects", json={"name": "Geography"}, headers=headers).json()
    material = client.post(
        f"/study-materials?subject_id={subject['id']}",
        files={"file": ("map.txt", b"Maps show locations.", "text/plain")},
        headers=headers,
    ).json()
    monkeypatch.setattr(
        "app.routers.study_materials.extract_material_text",
        lambda path, content_type: "Maps show locations.",
    )
    monkeypatch.setattr(ai, "OPENAI_API_KEY", None)

    response = client.post(
        f"/study-materials/{material['id']}/ask",
        json={"question": "What do maps show?"},
        headers=headers,
    )

    assert response.status_code == 503
    client.delete(f"/study-materials/{material['id']}", headers=headers)


def test_material_question_rejects_blank_question(client):
    headers = _auth_headers(
        client, "material-qa-validation@university.edu", "Material QA Validation"
    )
    response = client.post(
        "/study-materials/1/ask",
        json={"question": "   "},
        headers=headers,
    )

    assert response.status_code == 422


def test_material_text_extraction_supports_plain_text(tmp_path):
    path = tmp_path / "lecture.txt"
    path.write_text("Important concept.", encoding="utf-8")

    assert ai.extract_material_text(path, "text/plain") == "Important concept."


def test_material_text_extraction_rejects_empty_text(tmp_path):
    path = tmp_path / "empty.txt"
    path.write_text("   ", encoding="utf-8")

    with pytest.raises(ai.AIInputError):
        ai.extract_material_text(path, "text/plain")


def test_study_plan_generation_uses_owned_planning_context(client, monkeypatch):
    headers = _auth_headers(client, "plan-owner@university.edu", "Plan Owner")
    subject = client.post(
        "/subjects",
        json={"name": "Algorithms", "progress": 25},
        headers=headers,
    ).json()
    client.post(
        "/study-goals",
        json={"subject_id": subject["id"], "title": "Finish graphs"},
        headers=headers,
    )
    client.post(
        "/study-sessions",
        json={
            "subject_id": subject["id"],
            "title": "Graph traversal review",
            "scheduled_for": "2026-09-05T10:00:00Z",
            "duration_minutes": 45,
        },
        headers=headers,
    )
    captured = {}

    def fake_generate(subjects, goals, sessions, days, minutes, priorities):
        captured.update(
            subjects=subjects,
            goals=goals,
            sessions=sessions,
            days=days,
            minutes=minutes,
            priorities=priorities,
        )
        return "Day 1: Review graph traversal for 45 minutes."

    monkeypatch.setattr("app.routers.study_planning.generate_study_plan", fake_generate)
    response = client.post(
        "/study-plans/generate",
        json={"subject_ids": [subject["id"]], "days": 3, "minutes_per_day": 45},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {"plan": "Day 1: Review graph traversal for 45 minutes."}
    assert "Algorithms" in captured["subjects"]
    assert "Finish graphs" in captured["goals"]
    assert captured["days"] == 3


def test_study_plan_generation_rejects_foreign_subject(client, monkeypatch):
    owner_headers = _auth_headers(client, "plan-owner-2@university.edu", "Plan Owner 2")
    other_headers = _auth_headers(client, "plan-other@university.edu", "Plan Other")
    subject = client.post(
        "/subjects", json={"name": "Private"}, headers=owner_headers
    ).json()
    monkeypatch.setattr(
        "app.routers.study_planning.generate_study_plan",
        lambda *args: pytest.fail("The provider must not be called."),
    )

    response = client.post(
        "/study-plans/generate",
        json={"subject_ids": [subject["id"]]},
        headers=other_headers,
    )

    assert response.status_code == 404


def test_study_plan_generation_requires_authentication(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.study_planning.generate_study_plan",
        lambda *args: pytest.fail("The provider must not be called."),
    )

    response = client.post("/study-plans/generate", json={})

    assert response.status_code == 401


def test_quiz_generation_returns_structured_preview_for_owned_subject(client, monkeypatch):
    headers = _auth_headers(client, "quiz-ai-owner@university.edu", "Quiz AI Owner")
    subject = client.post(
        "/subjects",
        json={"name": "Biology", "description": "Cell biology"},
        headers=headers,
    ).json()
    generated = {
        "title": "Cell Biology Review",
        "questions": [
            {
                "question": "What is the powerhouse of the cell?",
                "options": ["Nucleus", "Mitochondrion"],
                "correct_answer": "Mitochondrion",
                "explanation": "Mitochondria produce most cellular ATP.",
            }
        ],
    }
    monkeypatch.setattr(
        "app.routers.quizzes.generate_quiz",
        lambda source, count, topic: generated,
    )

    response = client.post(
        "/quizzes/generate",
        json={"subject_id": subject["id"], "question_count": 1},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == generated


def test_quiz_generation_supports_owned_material(client, monkeypatch):
    headers = _auth_headers(client, "quiz-ai-material@university.edu", "Quiz AI Material")
    subject = client.post("/subjects", json={"name": "Networks"}, headers=headers).json()
    material = client.post(
        f"/study-materials?subject_id={subject['id']}",
        files={"file": ("tcp.txt", b"TCP uses a handshake.", "text/plain")},
        headers=headers,
    ).json()
    captured = {}

    monkeypatch.setattr(
        "app.routers.quizzes.extract_material_text",
        lambda path, content_type: "TCP uses a handshake.",
    )
    monkeypatch.setattr(
        "app.routers.quizzes.generate_quiz",
        lambda source, count, topic: captured.update(source=source)
        or {
            "title": "TCP Review",
            "questions": [
                {
                    "question": "What does TCP use?",
                    "options": ["A handshake", "A broadcast"],
                    "correct_answer": "A handshake",
                    "explanation": "TCP establishes communication with a handshake.",
                }
            ],
        },
    )

    response = client.post(
        "/quizzes/generate",
        json={"material_id": material["id"], "question_count": 1},
        headers=headers,
    )

    assert response.status_code == 200
    assert "TCP uses a handshake." in captured["source"]
    client.delete(f"/study-materials/{material['id']}", headers=headers)


def test_quiz_generation_maps_provider_failure(client, monkeypatch):
    headers = _auth_headers(client, "quiz-ai-provider@university.edu", "Quiz AI Provider")
    subject = client.post("/subjects", json={"name": "Chemistry"}, headers=headers).json()
    monkeypatch.setattr(
        "app.routers.quizzes.generate_quiz",
        lambda *args: (_ for _ in ()).throw(ai.AIProviderError("provider failed")),
    )

    response = client.post(
        "/quizzes/generate",
        json={"subject_id": subject["id"], "question_count": 1},
        headers=headers,
    )

    assert response.status_code == 502


def test_quiz_generation_requires_authentication(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.quizzes.generate_quiz",
        lambda *args: pytest.fail("The provider must not be called."),
    )

    response = client.post("/quizzes/generate", json={"subject_id": 1})

    assert response.status_code == 401


def test_quiz_generation_rejects_foreign_subject(client, monkeypatch):
    owner_headers = _auth_headers(client, "quiz-ai-owner-2@university.edu", "Quiz AI Owner 2")
    other_headers = _auth_headers(client, "quiz-ai-other@university.edu", "Quiz AI Other")
    subject = client.post(
        "/subjects", json={"name": "Private"}, headers=owner_headers
    ).json()
    monkeypatch.setattr(
        "app.routers.quizzes.generate_quiz",
        lambda *args: pytest.fail("The provider must not be called."),
    )

    response = client.post(
        "/quizzes/generate",
        json={"subject_id": subject["id"]},
        headers=other_headers,
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"subject_id": 1, "material_id": 1},
        {"question_count": 0, "subject_id": 1},
        {"subject_id": 1, "question_count": 21},
    ],
)
def test_quiz_generation_validates_input(client, payload):
    headers = _auth_headers(
        client, "quiz-ai-validation@university.edu", "Quiz AI Validation"
    )

    response = client.post("/quizzes/generate", json=payload, headers=headers)

    assert response.status_code == 422


def test_quiz_generation_maps_missing_api_key(client, monkeypatch):
    headers = _auth_headers(client, "quiz-ai-config@university.edu", "Quiz AI Config")
    subject = client.post(
        "/subjects", json={"name": "Physics"}, headers=headers
    ).json()
    monkeypatch.setattr(ai, "OPENAI_API_KEY", None)

    response = client.post(
        "/quizzes/generate",
        json={"subject_id": subject["id"], "question_count": 1},
        headers=headers,
    )

    assert response.status_code == 503


def test_quiz_generation_rejects_malformed_provider_response(monkeypatch):
    monkeypatch.setattr(ai, "OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr(
        ai,
        "_request_completion",
        lambda messages: '{"title":"Broken","questions":[{"question":"Q"}]}',
    )

    with pytest.raises(ai.AIProviderError):
        ai.generate_quiz("Subject context", 1, None)
