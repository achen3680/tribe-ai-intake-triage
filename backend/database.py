"""SQLite connection and schema initialization."""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from backend.models import Base


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parent / "data" / "intakes.db"
DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DATABASE_PATH}"


def make_engine(database_url: str | None = None) -> Engine:
    """Create an engine for the configured SQLite database."""

    selected_url = database_url or os.getenv("DATABASE_URL")
    if selected_url is None:
        DEFAULT_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
        selected_url = DEFAULT_DATABASE_URL
    return create_engine(selected_url)


def init_db(engine: Engine | None = None) -> None:
    """Create the intake table if it does not already exist."""

    Base.metadata.create_all(engine or make_engine())


if __name__ == "__main__":
    init_db()
