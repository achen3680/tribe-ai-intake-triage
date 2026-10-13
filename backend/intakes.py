"""Persistence operations for intakes."""

from __future__ import annotations

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
            )
            session.add(intake)
            session.commit()
            session.refresh(intake)
            return intake
    finally:
        if owns_engine:
            engine.dispose()
