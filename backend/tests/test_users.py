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
