"""Tests for the intake API endpoints."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.api import app
from backend.models import Intake
from backend.triage import TriageResult


VALID_INTAKE = {
    "title": "Customer support assistant",
    "description": "Answer support questions.",
    "budget_range": "$25k-$50k",
    "timeline": "3 months",
    "industry": "Retail",
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'api.db'}")
    monkeypatch.setattr(
        "backend.api.generate_triage",
        lambda intake: TriageResult.model_validate({
            "summary": "This is a customer support project. It will answer questions.",
            "tags": {"industry": "retail", "budget": "medium", "timeline": "near-term"},
            "risks": ["Confirm the knowledge base is current."],
        }),
    )
    with TestClient(app) as test_client:
        yield test_client


def test_post_intake_creates_and_returns_saved_record(client):
    response = client.post("/intakes", json={**VALID_INTAKE, "title": "  Pilot  "})

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["title"] == "Pilot"
    assert {key: body[key] for key in VALID_INTAKE if key != "title"} == {
        key: value for key, value in VALID_INTAKE.items() if key != "title"
    }
    assert datetime.fromisoformat(body["created_at"].replace("Z", "+00:00")).tzinfo == timezone.utc
    assert body["summary"] == "This is a customer support project. It will answer questions."
    assert body["tags"] == {"industry": "retail", "budget": "medium", "timeline": "near-term"}
    assert body["risks"] == ["Confirm the knowledge base is current."]
    assert body["triage_status"] == "complete"

    with Session(app.state.engine) as session:
        saved = session.get(Intake, body["id"])
        assert saved is not None
        assert saved.title == "Pilot"
        assert saved.summary == body["summary"]
        assert saved.tags == body["tags"]
        assert saved.risks == body["risks"]


def test_ai_failure_still_saves_intake(client, monkeypatch):
    def fail(_intake):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr("backend.api.generate_triage", fail)
    response = client.post("/intakes", json=VALID_INTAKE)
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["triage_status"] == "unavailable"
    assert body["summary"] is None
    assert body["tags"] is None
    assert body["risks"] is None
    assert client.get(f"/intakes/{body['id']}").json() == body
    with Session(app.state.engine) as session:
        assert session.scalar(select(func.count()).select_from(Intake)) == 1


@pytest.mark.parametrize("field", VALID_INTAKE)
@pytest.mark.parametrize("invalid_value", [None, "", "   "])
def test_post_intake_rejects_missing_or_blank_fields(client, field, invalid_value):
    payload = VALID_INTAKE.copy()
    if invalid_value is None:
        payload.pop(field)
    else:
        payload[field] = invalid_value

    response = client.post("/intakes", json=payload)

    assert response.status_code == 422
    with Session(app.state.engine) as session:
        assert session.scalar(select(func.count()).select_from(Intake)) == 0


def test_get_intakes_returns_all_saved_intakes(client):
    assert client.get("/intakes").json() == []

    first = client.post("/intakes", json=VALID_INTAKE).json()
    second_payload = {
        **VALID_INTAKE,
        "title": "Inventory forecasting pilot",
        "industry": "Manufacturing",
    }
    second = client.post("/intakes", json=second_payload).json()

    response = client.get("/intakes")

    assert response.status_code == 200
    assert response.json() == [first, second]


def test_get_intake_by_id_returns_saved_intake(client):
    first = client.post("/intakes", json=VALID_INTAKE).json()
    second = client.post("/intakes", json={**VALID_INTAKE, "title": "Another intake"}).json()

    response = client.get(f"/intakes/{first['id']}")

    assert response.status_code == 200
    assert response.json() == first
    assert response.json() != second


def test_get_intake_by_id_returns_404_when_missing(client):
    response = client.get("/intakes/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Intake not found"}
