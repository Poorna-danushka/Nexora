from tests.test_users import _auth_headers


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
