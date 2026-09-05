from app.models.ai_conversation import AIConversation
from app.models.ai_usage import AIUsage
from app.services import ai
from tests.test_users import _auth_headers


def test_conversation_crud_is_scoped_to_owner(client):
    owner_headers = _auth_headers(
        client, "conversation-owner@university.edu", "Conversation Owner"
    )
    other_headers = _auth_headers(
        client, "conversation-other@university.edu", "Conversation Other"
    )

    created = client.post(
        "/ai/conversations",
        json={"title": "Biology review"},
        headers=owner_headers,
    )
    assert created.status_code == 201
    conversation_id = created.json()["id"]

    assert client.get("/ai/conversations", headers=owner_headers).json()[0]["id"] == conversation_id
    assert client.get(f"/ai/conversations/{conversation_id}", headers=other_headers).status_code == 404
    assert client.patch(
        f"/ai/conversations/{conversation_id}",
        json={"title": "Updated review"},
        headers=other_headers,
    ).status_code == 404
    assert client.delete(
        f"/ai/conversations/{conversation_id}", headers=other_headers
    ).status_code == 404

    renamed = client.patch(
        f"/ai/conversations/{conversation_id}",
        json={"title": "Updated review"},
        headers=owner_headers,
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Updated review"

    assert client.delete(
        f"/ai/conversations/{conversation_id}", headers=owner_headers
    ).status_code == 204
    assert client.get(
        f"/ai/conversations/{conversation_id}", headers=owner_headers
    ).status_code == 404


def test_conversation_messages_are_persisted_and_include_history(
    client, monkeypatch, db
):
    headers = _auth_headers(
        client, "conversation-messages@university.edu", "Conversation Messages"
    )
    conversation = client.post(
        "/ai/conversations",
        json={"title": "History"},
        headers=headers,
    ).json()
    captured = {}

    def fake_answer(messages):
        captured["messages"] = messages
        return "The answer."

    monkeypatch.setattr("app.routers.ai_conversations.answer_conversation", fake_answer)

    first = client.post(
        f"/ai/conversations/{conversation['id']}/messages",
        json={"content": "What is photosynthesis?"},
        headers=headers,
    )
    assert first.status_code == 200
    assert [message["role"] for message in first.json()] == ["user", "assistant"]

    second = client.post(
        f"/ai/conversations/{conversation['id']}/messages",
        json={"content": "Can you summarize that?"},
        headers=headers,
    )
    assert second.status_code == 200
    assert len(second.json()) == 4
    assert captured["messages"] == [
        {"role": "user", "content": "What is photosynthesis?"},
        {"role": "assistant", "content": "The answer."},
        {"role": "user", "content": "Can you summarize that?"},
    ]

    listed = client.get(
        f"/ai/conversations/{conversation['id']}/messages", headers=headers
    )
    assert listed.status_code == 200
    assert listed.json() == second.json()
    assert db.query(AIConversation).count() == 1
    assert db.query(AIUsage).filter(AIUsage.feature == "ai_chat").count() == 2


def test_conversation_messages_reject_blank_input(client):
    headers = _auth_headers(
        client, "conversation-validation@university.edu", "Conversation Validation"
    )
    conversation = client.post(
        "/ai/conversations", json={}, headers=headers
    ).json()

    response = client.post(
        f"/ai/conversations/{conversation['id']}/messages",
        json={"content": "   "},
        headers=headers,
    )
    assert response.status_code == 422


def test_conversation_provider_failure_is_safe_and_recorded(
    client, monkeypatch, db
):
    headers = _auth_headers(
        client, "conversation-provider@university.edu", "Conversation Provider"
    )
    conversation = client.post(
        "/ai/conversations", json={}, headers=headers
    ).json()

    def fail_answer(messages):
        raise ai.AIProviderError("provider detail must not reach the client")

    monkeypatch.setattr("app.routers.ai_conversations.answer_conversation", fail_answer)
    response = client.post(
        f"/ai/conversations/{conversation['id']}/messages",
        json={"content": "Explain this topic."},
        headers=headers,
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "Unable to respond right now."}
    usage = db.query(AIUsage).filter(AIUsage.feature == "ai_chat").one()
    assert usage.success is False
    assert "provider detail" not in response.text


def test_conversation_endpoints_require_authentication(client):
    assert client.get("/ai/conversations").status_code == 401
    assert client.post("/ai/conversations", json={"title": "Private"}).status_code == 401
