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
