"""Checks for the intake model and SQLite schema."""

from dataclasses import is_dataclass
from datetime import datetime, timezone

import pytest
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from backend.database import init_db, make_engine
from backend.intakes import create_intake
from backend.models import Intake


def test_intake_table_and_persistence(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    init_db(engine)
    init_db(engine)

    assert is_dataclass(Intake)
    columns = {column["name"]: column for column in inspect(engine).get_columns("intakes")}
    assert set(columns) == {
        "id", "title", "description", "budget_range", "timeline", "industry", "created_at",
        "summary", "tags", "risks",
    }
    assert all(not columns[name]["nullable"] for name in (
        "id", "title", "description", "budget_range", "timeline", "industry", "created_at"
    ))

    intake = Intake(
        title="Pilot",
        description="Build a prototype",
        budget_range="$10k-$20k",
        timeline="Q1",
        industry="Healthcare",
    )
    assert isinstance(intake.created_at, datetime)
    assert intake.created_at.tzinfo == timezone.utc
    original_created_at = intake.created_at

    with Session(engine) as session:
        session.add(intake)
        session.commit()

    with Session(engine) as session:
        saved = session.scalar(select(Intake))
        assert saved is not None
        assert saved.id == 1
        assert saved.title == "Pilot"
        assert saved.created_at == original_created_at
        assert saved.created_at.tzinfo == timezone.utc


def test_create_intake_saves_sample_data(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'sample.db'}")
    init_db(engine)

    created = create_intake(
        title="Customer support assistant",
        description="Answer support questions from the knowledge base.",
        budget_range="$25k-$50k",
        timeline="3 months",
        industry="Retail",
        engine=engine,
    )

    assert created.id == 1
    assert created.created_at.tzinfo == timezone.utc
    with Session(engine) as session:
        saved = session.scalar(select(Intake).where(Intake.id == created.id))
        assert saved is not None
        assert saved.title == "Customer support assistant"
        assert saved.description == "Answer support questions from the knowledge base."
        assert saved.budget_range == "$25k-$50k"
        assert saved.timeline == "3 months"
        assert saved.industry == "Retail"
        assert saved.created_at == created.created_at


def test_init_db_adds_ai_columns_to_existing_table(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE intakes (id INTEGER PRIMARY KEY, title VARCHAR NOT NULL, "
            "description TEXT NOT NULL, budget_range VARCHAR NOT NULL, "
            "timeline VARCHAR NOT NULL, industry VARCHAR NOT NULL, created_at DATETIME NOT NULL)"
        )
        connection.exec_driver_sql(
            "INSERT INTO intakes VALUES (1, 'Existing', 'Original intake', '$10k', "
            "'2 months', 'Retail', '2026-01-01 00:00:00')"
        )

    init_db(engine)
    init_db(engine)

    with Session(engine) as session:
        saved = session.get(Intake, 1)
        assert saved is not None
        assert saved.title == "Existing"
        assert saved.summary is None
        assert saved.tags is None
        assert saved.risks is None


@pytest.mark.parametrize(
    "missing_field",
    ("title", "description", "budget_range", "timeline", "industry"),
)
def test_create_intake_requires_each_field(tmp_path, missing_field):
    engine = make_engine(f"sqlite:///{tmp_path / 'missing-field.db'}")
    init_db(engine)
    data = {
        "title": "Customer support assistant",
        "description": "Answer support questions.",
        "budget_range": "$25k-$50k",
        "timeline": "3 months",
        "industry": "Retail",
    }
    data.pop(missing_field)

    with pytest.raises(TypeError, match=missing_field):
        create_intake(**data, engine=engine)

    with Session(engine) as session:
        assert session.scalar(select(Intake)) is None
