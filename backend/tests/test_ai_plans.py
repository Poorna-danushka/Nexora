from tests.test_users import _auth_headers


def test_generated_study_plan_is_persisted_and_owner_scoped(client, monkeypatch):
    owner = _auth_headers(client, "plan-owner@university.edu", "Plan Owner")
    other = _auth_headers(client, "plan-other@university.edu", "Plan Other")
    monkeypatch.setattr(
        "app.routers.study_planning.generate_study_plan",
        lambda *args: "Day 1: Review algebra.",
    )

    generated = client.post(
        "/study-plans/generate",
        json={"days": 3, "minutes_per_day": 45, "priorities": "Algebra"},
        headers=owner,
    )
    assert generated.status_code == 200
    plan_id = generated.json()["id"]
    assert generated.json()["plan"] == "Day 1: Review algebra."

    listed = client.get("/study-plans", headers=owner)
    assert listed.status_code == 200
    assert listed.json()[0]["id"] == plan_id
    assert client.get(f"/study-plans/{plan_id}", headers=other).status_code == 404
    assert client.delete(f"/study-plans/{plan_id}", headers=other).status_code == 404

    assert client.delete(f"/study-plans/{plan_id}", headers=owner).status_code == 204
    assert client.get(f"/study-plans/{plan_id}", headers=owner).status_code == 404
