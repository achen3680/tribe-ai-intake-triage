"""Checks for the intake model and SQLite schema."""

from dataclasses import is_dataclass
from datetime import datetime, timezone

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from backend.database import init_db, make_engine
from backend.models import Intake


def test_intake_table_and_persistence(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    init_db(engine)
    init_db(engine)

    assert is_dataclass(Intake)
    columns = {column["name"]: column for column in inspect(engine).get_columns("intakes")}
    assert set(columns) == {
        "id", "title", "description", "budget_range", "timeline", "industry", "created_at"
    }
    assert all(not column["nullable"] for column in columns.values())

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
