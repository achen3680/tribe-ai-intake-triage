"""HTTP entry point for creating intakes."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request, status
from pydantic import BaseModel, ConfigDict, field_validator

from backend.database import init_db, make_engine
from backend.intakes import create_intake


class CreateIntakeRequest(BaseModel):
    """Fields required to create an intake."""

    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    budget_range: str
    timeline: str
    industry: str

    @field_validator("title", "description", "budget_range", "timeline", "industry")
    @classmethod
    def require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class IntakeResponse(CreateIntakeRequest):
    """Saved intake returned to the frontend."""

    id: int
    created_at: datetime


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = make_engine()
    try:
        init_db(engine)
        app.state.engine = engine
        yield
    finally:
        engine.dispose()


app = FastAPI(lifespan=lifespan)


@app.post("/intakes", response_model=IntakeResponse, status_code=status.HTTP_201_CREATED)
def post_intake(payload: CreateIntakeRequest, request: Request) -> IntakeResponse:
    intake = create_intake(**payload.model_dump(), engine=request.app.state.engine)
    return IntakeResponse.model_validate(intake, from_attributes=True)
