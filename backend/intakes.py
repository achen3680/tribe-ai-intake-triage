"""Persistence operations for intakes."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from backend.database import make_engine
from backend.models import Intake


def create_intake(
    *,
    title: str,
    description: str,
    budget_range: str,
    timeline: str,
    industry: str,
    summary: str | None = None,
    tags: dict | None = None,
    risks: list[str] | None = None,
    engine: Engine | None = None,
) -> Intake:
    """Save a new intake and return it with its database ID and timestamp."""

    owns_engine = engine is None
    engine = engine or make_engine()
    try:
        with Session(engine, expire_on_commit=False) as session:
            intake = Intake(
                title=title,
                description=description,
                budget_range=budget_range,
                timeline=timeline,
                industry=industry,
                summary=summary,
                tags=tags,
                risks=risks,
            )
            session.add(intake)
            session.commit()
            session.refresh(intake)
            return intake
    finally:
        if owns_engine:
            engine.dispose()


def list_intakes(*, engine: Engine | None = None) -> list[Intake]:
    """Return every intake in ID order."""

    owns_engine = engine is None
    engine = engine or make_engine()
    try:
        with Session(engine) as session:
            return list(session.scalars(select(Intake).order_by(Intake.id)))
    finally:
        if owns_engine:
            engine.dispose()


def get_intake(intake_id: int, *, engine: Engine | None = None) -> Intake | None:
    """Return an intake by ID, or None when it does not exist."""

    owns_engine = engine is None
    engine = engine or make_engine()
    try:
        with Session(engine) as session:
            return session.get(Intake, intake_id)
    finally:
        if owns_engine:
            engine.dispose()
