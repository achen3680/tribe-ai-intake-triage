"""Opt-in end-to-end test against the real Claude API and a temporary SQLite DB."""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.api import app
from backend.models import Intake
from backend.triage import TriageResult


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_AI_TESTS") != "1",
    reason="Set RUN_LIVE_AI_TESTS=1 to call the real Claude API",
)


def test_live_claude_triage_is_returned_and_persisted_for_each_intake(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'live-ai.db'}")
    payloads = [
        {
            "title": "Retail support assistant",
            "description": "Answer common customer questions from a retail knowledge base and hand uncertain answers to support agents.",
            "budget_range": "$25k-$50k",
            "timeline": "3 months",
            "industry": "Retail",
        },
        {
            "title": "Healthcare appointment helper",
            "description": "Help patients find available appointment slots and route scheduling exceptions to staff.",
            "budget_range": "$10k-$20k",
            "timeline": "6 weeks",
            "industry": "Healthcare",
        },
    ]

    # TestClient starts the app, loads .env, and uses the real generate_triage function.
    with TestClient(app) as client:
        assert os.getenv("ANTHROPIC_API_KEY"), "Configure ANTHROPIC_API_KEY in .env or the environment"
        created = []
        for payload in payloads:
            response = client.post("/intakes", json=payload)
            assert response.status_code == 201
            body = response.json()
            assert body["triage_status"] == "complete", body
            assert body["summary"] and body["summary"].strip()
            assert body["tags"] and set(body["tags"]) == {"industry", "budget", "timeline"}
            assert body["risks"] and all(risk.strip() for risk in body["risks"])
            TriageResult.model_validate({key: body[key] for key in ("summary", "tags", "risks")})
            assert client.get(f"/intakes/{body['id']}").json() == body
            with Session(app.state.engine) as session:
                saved = session.get(Intake, body["id"])
                assert saved is not None
                assert saved.summary == body["summary"]
                assert saved.tags == body["tags"]
                assert saved.risks == body["risks"]
            created.append(body)

        assert [item["id"] for item in client.get("/intakes").json()] == [
            item["id"] for item in created
        ]
        assert created[0]["summary"] != created[1]["summary"]
