"""SQLite connection and schema initialization."""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from backend.models import Base


DEFAULT_DATABASE_URL = f"sqlite:///{Path(__file__).resolve().parent.parent / 'intakes.db'}"


def make_engine(database_url: str | None = None) -> Engine:
    """Create an engine for the configured SQLite database."""

    return create_engine(database_url or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))


def init_db(engine: Engine | None = None) -> None:
    """Create the intake table if it does not already exist."""

    Base.metadata.create_all(engine or make_engine())


if __name__ == "__main__":
    init_db()
