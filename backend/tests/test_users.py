def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Nexora API"}


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "database" in data


def test_create_user(client):
    payload = {
        "full_name": "Test Student",
        "email": "teststudent@university.edu",
        "password": "securepassword123",
        "university": "State University",
        "degree": "B.S. Computer Science",
        "graduation_year": 2026,
    }
    response = client.post("/users", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "teststudent@university.edu"
    assert data["full_name"] == "Test Student"
    assert "password" not in data
    assert "password_hash" not in data


def test_login_and_current_user(client):
    payload = {
        "full_name": "Login Student",
        "email": "LOGIN@university.edu",
        "password": "securepassword123",
    }
    assert client.post("/users", json=payload).status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": "login@university.edu", "password": payload["password"]},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    current_user = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert current_user.status_code == 200
    assert current_user.json()["email"] == "login@university.edu"


def test_login_rejects_invalid_password(client):
    payload = {
        "full_name": "Invalid Login",
        "email": "invalid@university.edu",
        "password": "securepassword123",
    }
    assert client.post("/users", json=payload).status_code == 201

    response = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_current_user_requires_token(client):
    response = client.get("/users/me")
    assert response.status_code == 401


def test_update_current_user(client):
    payload = {
        "full_name": "Profile Student",
        "email": "profile@university.edu",
        "password": "securepassword123",
    }
    assert client.post("/users", json=payload).status_code == 201
    token = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    ).json()["access_token"]

    response = client.patch(
        "/users/me",
        json={"university": "Updated University", "graduation_year": 2027},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["university"] == "Updated University"
    assert response.json()["graduation_year"] == 2027


def test_login_rate_limit(client):
    payload = {
        "full_name": "Rate Limited",
        "email": "rate-limited@university.edu",
        "password": "securepassword123",
    }
    assert client.post("/users", json=payload).status_code == 201
    for _ in range(5):
        assert client.post(
            "/auth/login",
            json={"email": payload["email"], "password": "wrong-password"},
        ).status_code == 401

    response = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": "wrong-password"},
    )
    assert response.status_code == 429


def _auth_headers(client, email: str, full_name: str):
    password = "securepassword123"
    assert client.post(
        "/users",
        json={"full_name": full_name, "email": email, "password": password},
    ).status_code == 201
    token = client.post(
        "/auth/login", json={"email": email, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_subject_crud_is_scoped_to_current_user(client):
    owner_headers = _auth_headers(client, "subject-owner@university.edu", "Subject Owner")
    other_headers = _auth_headers(client, "subject-other@university.edu", "Subject Other")

    created = client.post(
        "/subjects",
        json={"name": "Data Structures", "progress": 25},
        headers=owner_headers,
    )
    assert created.status_code == 201
    subject_id = created.json()["id"]

    listed = client.get("/subjects", headers=owner_headers)
    assert listed.status_code == 200
    assert [subject["id"] for subject in listed.json()] == [subject_id]

    assert client.get("/subjects", headers=other_headers).json() == []
    assert client.patch(
        f"/subjects/{subject_id}",
        json={"progress": 80},
        headers=other_headers,
    ).status_code == 404
    assert client.delete(
        f"/subjects/{subject_id}", headers=other_headers
    ).status_code == 404

    updated = client.patch(
        f"/subjects/{subject_id}",
        json={"progress": 80, "is_completed": True},
        headers=owner_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["progress"] == 80
    assert updated.json()["is_completed"] is True

    assert client.delete(
        f"/subjects/{subject_id}", headers=owner_headers
    ).status_code == 204


def test_note_crud_requires_owned_subject(client):
    owner_headers = _auth_headers(client, "note-owner@university.edu", "Note Owner")
    other_headers = _auth_headers(client, "note-other@university.edu", "Note Other")

    subject = client.post(
        "/subjects",
        json={"name": "Algorithms"},
        headers=owner_headers,
    ).json()
    note = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Big O", "content": "Study complexity."},
        headers=owner_headers,
    )
    assert note.status_code == 201
    note_id = note.json()["id"]

    assert client.get("/notes", headers=owner_headers).json()[0]["id"] == note_id
    assert client.get(
        "/notes", params={"subject_id": subject["id"]}, headers=owner_headers
    ).status_code == 200
    assert client.get(f"/notes/{note_id}", headers=other_headers).status_code == 404
    assert client.patch(
        f"/notes/{note_id}",
        json={"content": "Changed"},
        headers=other_headers,
    ).status_code == 404

    updated = client.patch(
        f"/notes/{note_id}",
        json={"title": "Big O Notation"},
        headers=owner_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Big O Notation"
    assert client.delete(f"/notes/{note_id}", headers=owner_headers).status_code == 204


def test_note_rejects_subject_owned_by_another_user(client):
    owner_headers = _auth_headers(client, "note-subject-owner@university.edu", "Subject Owner")
    other_headers = _auth_headers(client, "note-subject-other@university.edu", "Subject Other")
    subject = client.post(
        "/subjects", json={"name": "Private Subject"}, headers=owner_headers
    ).json()

    response = client.post(
        "/notes",
        json={"subject_id": subject["id"], "title": "Blocked", "content": "No access."},
        headers=other_headers,
    )
    assert response.status_code == 404


def test_study_material_upload_is_owner_scoped(client):
    headers = _auth_headers(client, "material-owner@university.edu", "Material Owner")
    other_headers = _auth_headers(client, "material-other@university.edu", "Material Other")
    subject = client.post("/subjects", json={"name": "Networking"}, headers=headers).json()

    upload = client.post(
        f"/study-materials?subject_id={subject['id']}",
        files={"file": ("lecture.txt", b"TCP notes", "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 201
    material = upload.json()
    assert material["original_filename"] == "lecture.txt"
    assert material["file_size"] == 9
    assert client.get("/study-materials", headers=other_headers).json() == []
    assert client.get(
        f"/study-materials/{material['id']}/download", headers=other_headers
    ).status_code == 404
    assert client.delete(
        f"/study-materials/{material['id']}", headers=headers
    ).status_code == 204


def test_study_material_rejects_unsupported_type(client):
    headers = _auth_headers(client, "material-type@university.edu", "Material Type")
    subject = client.post("/subjects", json={"name": "Security"}, headers=headers).json()
    response = client.post(
        f"/study-materials?subject_id={subject['id']}",
        files={"file": ("script.exe", b"unsafe", "application/octet-stream")},
        headers=headers,
    )
    assert response.status_code == 415


def test_study_planning_crud_is_owner_scoped(client):
    owner_headers = _auth_headers(client, "planning-owner@university.edu", "Planning Owner")
    other_headers = _auth_headers(client, "planning-other@university.edu", "Planning Other")
    subject = client.post(
        "/subjects", json={"name": "Operating Systems"}, headers=owner_headers
    ).json()

    session = client.post(
        "/study-sessions",
        json={
            "subject_id": subject["id"],
            "title": "Process scheduling",
            "scheduled_for": "2026-02-01T10:00:00Z",
            "duration_minutes": 45,
        },
        headers=owner_headers,
    )
    assert session.status_code == 201
    session_id = session.json()["id"]

    goal = client.post(
        "/study-goals",
        json={
            "subject_id": subject["id"],
            "title": "Finish OS chapter",
            "target_date": "2026-02-07T23:59:00Z",
        },
        headers=owner_headers,
    )
    assert goal.status_code == 201
    goal_id = goal.json()["id"]

    assert [item["id"] for item in client.get(
        "/study-sessions", headers=owner_headers
    ).json()] == [session_id]
    assert [item["id"] for item in client.get(
        "/study-goals", headers=owner_headers
    ).json()] == [goal_id]
    assert client.get("/study-sessions", headers=other_headers).json() == []
    assert client.get("/study-goals", headers=other_headers).json() == []
    assert client.patch(
        f"/study-sessions/{session_id}",
        json={"is_completed": True},
        headers=other_headers,
    ).status_code == 404
    assert client.delete(
        f"/study-goals/{goal_id}", headers=other_headers
    ).status_code == 404

    updated_session = client.patch(
        f"/study-sessions/{session_id}",
        json={"title": "Review process scheduling", "duration_minutes": 60},
        headers=owner_headers,
    )
    assert updated_session.status_code == 200
    assert updated_session.json()["duration_minutes"] == 60

    updated_goal = client.patch(
        f"/study-goals/{goal_id}",
        json={"is_completed": True},
        headers=owner_headers,
    )
    assert updated_goal.status_code == 200
    assert updated_goal.json()["is_completed"] is True
    assert client.delete(
        f"/study-sessions/{session_id}", headers=owner_headers
    ).status_code == 204
    assert client.delete(
        f"/study-goals/{goal_id}", headers=owner_headers
    ).status_code == 204


def test_study_planning_rejects_subject_owned_by_another_user(client):
    owner_headers = _auth_headers(
        client, "planning-subject-owner@university.edu", "Subject Owner"
    )
    other_headers = _auth_headers(
        client, "planning-subject-other@university.edu", "Subject Other"
    )
    subject = client.post(
        "/subjects", json={"name": "Private Planning"}, headers=owner_headers
    ).json()

    response = client.post(
        "/study-goals",
        json={"subject_id": subject["id"], "title": "Blocked"},
        headers=other_headers,
    )
    assert response.status_code == 404


def test_calendar_events_support_reminders_and_owner_scoping(client):
    owner_headers = _auth_headers(client, "calendar-owner@university.edu", "Calendar Owner")
    other_headers = _auth_headers(client, "calendar-other@university.edu", "Calendar Other")
    event = client.post(
        "/calendar-events",
        json={
            "title": "Exam review",
            "description": "Review lecture notes",
            "starts_at": "2026-09-04T10:00:00Z",
            "ends_at": "2026-09-04T11:00:00Z",
            "reminder_minutes": 15,
        },
        headers=owner_headers,
    )
    assert event.status_code == 201
    event_id = event.json()["id"]
    assert client.get("/calendar-events", headers=other_headers).json() == []
    assert client.get(
        f"/calendar-events/{event_id}", headers=other_headers
    ).status_code == 404
    assert client.patch(
        f"/calendar-events/{event_id}",
        json={"ends_at": "2026-09-04T09:00:00Z"},
        headers=owner_headers,
    ).status_code == 422
    updated = client.patch(
        f"/calendar-events/{event_id}",
        json={"title": "Final exam review"},
        headers=owner_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["reminder_minutes"] == 15
    assert client.delete(
        f"/calendar-events/{event_id}", headers=other_headers
    ).status_code == 404
    assert client.delete(
        f"/calendar-events/{event_id}", headers=owner_headers
    ).status_code == 204
