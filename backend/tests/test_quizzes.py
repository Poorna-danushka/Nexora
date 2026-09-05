from tests.test_users import _auth_headers
from app.services import ai


def test_practice_question_generation_validates_source_and_ownership(client, monkeypatch):
    owner = _auth_headers(client, "practice-owner@university.edu", "Practice Owner")
    other = _auth_headers(client, "practice-other@university.edu", "Practice Other")
    subject = client.post("/subjects", json={"name": "Chemistry"}, headers=owner).json()

    monkeypatch.setattr(
        "app.routers.quizzes.generate_practice_question",
        lambda source, topic: type(
            "Generated",
            (),
            {
                "questions": [
                    {
                        "question": "What is pH?",
                        "options": ["Acidity scale", "Mass unit"],
                        "correct_answer": "Acidity scale",
                        "explanation": "pH measures acidity.",
                    }
                ]
            },
        )(),
    )

    generated = client.post(
        "/quizzes/generate-question",
        json={"subject_id": subject["id"], "topic": "Acids"},
        headers=owner,
    )
    assert generated.status_code == 200
    assert generated.json()["correct_answer"] == "Acidity scale"

    blocked = client.post(
        "/quizzes/generate-question",
        json={"subject_id": subject["id"]},
        headers=other,
    )
    assert blocked.status_code == 404


def test_practice_question_generation_requires_exactly_one_source(client):
    headers = _auth_headers(
        client, "practice-validation@university.edu", "Practice Validation"
    )
    both = client.post(
        "/quizzes/generate-question",
        json={"subject_id": 1, "material_id": 1},
        headers=headers,
    )
    neither = client.post(
        "/quizzes/generate-question",
        json={},
        headers=headers,
    )
    assert both.status_code == 422
    assert neither.status_code == 422


def test_quiz_crud_questions_scoring_and_history(client):
    headers = _auth_headers(client, "quiz-owner@university.edu", "Quiz Owner")
    subject = client.post("/subjects", json={"name": "Biology"}, headers=headers).json()
    created = client.post(
        "/quizzes",
        json={"subject_id": subject["id"], "title": "Cell biology"},
        headers=headers,
    )
    assert created.status_code == 201
    quiz_id = created.json()["id"]

    question = client.post(
        f"/quizzes/{quiz_id}/questions",
        json={
            "prompt": "What is the powerhouse of the cell?",
            "options": ["Nucleus", "Mitochondrion"],
            "correct_option": 1,
        },
        headers=headers,
    )
    assert question.status_code == 201
    question_id = question.json()["id"]
    detail = client.get(f"/quizzes/{quiz_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["questions"][0]["id"] == question_id

    attempt = client.post(
        f"/quizzes/{quiz_id}/attempts",
        json={"answers": {question_id: 1}},
        headers=headers,
    )
    assert attempt.status_code == 201
    assert attempt.json()["score"] == 1
    assert attempt.json()["total"] == 1
    history = client.get(f"/quizzes/{quiz_id}/attempts", headers=headers)
    assert [item["id"] for item in history.json()] == [attempt.json()["id"]]


def test_quizzes_require_owned_subject_and_are_isolated(client):
    owner = _auth_headers(client, "quiz-owner-2@university.edu", "Quiz Owner 2")
    other = _auth_headers(client, "quiz-other@university.edu", "Quiz Other")
    subject = client.post("/subjects", json={"name": "Private"}, headers=owner).json()
    blocked = client.post(
        "/quizzes",
        json={"subject_id": subject["id"], "title": "Blocked"},
        headers=other,
    )
    assert blocked.status_code == 404

    quiz = client.post(
        "/quizzes",
        json={"subject_id": subject["id"], "title": "Private quiz"},
        headers=owner,
    ).json()
    assert client.get("/quizzes", headers=other).json() == []
    assert client.get(f"/quizzes/{quiz['id']}", headers=other).status_code == 404
    assert client.get(f"/quizzes/{quiz['id']}/attempts", headers=other).status_code == 404


def test_quiz_rejects_invalid_question_and_answer(client):
    headers = _auth_headers(client, "quiz-validation@university.edu", "Quiz Validation")
    subject = client.post("/subjects", json={"name": "Math"}, headers=headers).json()
    quiz = client.post(
        "/quizzes",
        json={"subject_id": subject["id"], "title": "Math quiz"},
        headers=headers,
    ).json()
    invalid_question = client.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"prompt": "Invalid", "options": ["A", "B"], "correct_option": 2},
        headers=headers,
    )
    assert invalid_question.status_code == 422


def test_quiz_question_explanation_is_owned_and_safe(client, monkeypatch):
    owner = _auth_headers(client, "explain-owner@university.edu", "Explain Owner")
    other = _auth_headers(client, "explain-other@university.edu", "Explain Other")
    subject = client.post("/subjects", json={"name": "Physics"}, headers=owner).json()
    quiz = client.post(
        "/quizzes",
        json={"subject_id": subject["id"], "title": "Motion"},
        headers=owner,
    ).json()
    question = client.post(
        f"/quizzes/{quiz['id']}/questions",
        json={
            "prompt": "What is speed?",
            "options": ["Distance over time", "Mass times acceleration"],
            "correct_option": 0,
        },
        headers=owner,
    ).json()

    captured = {}

    def fake_explanation(title, prompt, options, correct_option):
        captured.update(
            title=title,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
        )
        return "Speed is distance divided by time."

    monkeypatch.setattr("app.routers.quizzes.explain_quiz_question", fake_explanation)
    response = client.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/explain",
        headers=owner,
    )
    assert response.status_code == 200
    assert response.json()["explanation"] == "Speed is distance divided by time."
    assert captured["correct_option"] == 0

    blocked = client.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/explain",
        headers=other,
    )
    assert blocked.status_code == 404


def test_quiz_question_explanation_maps_provider_failure(client, monkeypatch):
    headers = _auth_headers(
        client, "explain-provider@university.edu", "Explain Provider"
    )
    subject = client.post("/subjects", json={"name": "Math"}, headers=headers).json()
    quiz = client.post(
        "/quizzes", json={"subject_id": subject["id"], "title": "Algebra"}, headers=headers
    ).json()
    question = client.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"prompt": "What is 2+2?", "options": ["4", "5"], "correct_option": 0},
        headers=headers,
    ).json()
    monkeypatch.setattr(
        "app.routers.quizzes.explain_quiz_question",
        lambda *args: (_ for _ in ()).throw(ai.AIProviderError("provider detail")),
    )
    response = client.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/explain",
        headers=headers,
    )
    assert response.status_code == 502
    assert response.json() == {"detail": "Unable to explain this question right now."}


def test_generated_quiz_can_be_saved_with_owned_subject(client):
    headers = _auth_headers(
        client, "generated-save@university.edu", "Generated Save"
    )
    subject = client.post("/subjects", json={"name": "Biology"}, headers=headers).json()
    response = client.post(
        "/quizzes/save-generated",
        json={
            "subject_id": subject["id"],
            "quiz": {
                "title": "AI Biology",
                "questions": [{
                    "question": "What is a cell?",
                    "options": ["Basic life unit", "A planet"],
                    "correct_answer": "Basic life unit",
                    "explanation": "Cells are the basic units of life.",
                }],
            },
        },
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["title"] == "AI Biology"
    assert response.json()["questions"][0]["correct_option"] == 0
