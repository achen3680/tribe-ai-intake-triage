"""Checks local validation recovery without making an API call."""

import json
from types import SimpleNamespace

from backend.triage import generate_triage


def test_generate_triage_retries_a_locally_invalid_claude_result(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    calls = []

    class FakeMessages:
        def create(self, **kwargs):
            calls.append(kwargs)
            summary = (
                "One sentence."
                if len(calls) == 1
                else "This intake creates a support assistant. It will answer customer questions."
            )
            result = {
                "summary": summary,
                "tags": {"industry": "retail", "budget": "medium", "timeline": "near-term"},
                "risks": ["Check the quality of the knowledge base."],
            }
            return SimpleNamespace(
                stop_reason="end_turn",
                content=[SimpleNamespace(type="text", text=json.dumps(result))],
            )

    class FakeAnthropic:
        def __init__(self, **kwargs):
            self.messages = FakeMessages()

    monkeypatch.setattr("backend.triage.Anthropic", FakeAnthropic)
    result = generate_triage({
        "title": "Support assistant",
        "description": "Answer customer questions.",
        "budget_range": "$25k-$50k",
        "timeline": "3 months",
        "industry": "Retail",
    })

    assert len(calls) == 2
    assert "prior output failed validation" in calls[1]["messages"][0]["content"]
    assert result.summary == "This intake creates a support assistant. It will answer customer questions."
