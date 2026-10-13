"""HTTP entry points for creating and reading intakes."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from anthropic import APIError
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, field_validator

from backend.database import init_db, make_engine
from backend.intakes import create_intake, get_intake, list_intakes
from backend.triage import Tags, generate_triage


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
    summary: Optional[str]
    tags: Optional[Tags]
    risks: Optional[list[str]]


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
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
    ## decision to keep the intake in the database, show no AI triage available, instead of blocking intake creation entirely
    try:
        triage = generate_triage(payload.model_dump())
    except (APIError, RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI triage is unavailable; intake was not saved. Please retry.",
        ) from exc
    intake = create_intake(
        **payload.model_dump(),
        **triage.model_dump(),
        engine=request.app.state.engine,
    )
    return IntakeResponse.model_validate(intake, from_attributes=True)


@app.get("/intakes", response_model=list[IntakeResponse])
def get_intakes(request: Request) -> list[IntakeResponse]:
    intakes = list_intakes(engine=request.app.state.engine)
    return [IntakeResponse.model_validate(intake, from_attributes=True) for intake in intakes]


@app.get("/intakes/{intake_id}", response_model=IntakeResponse)
def get_intake_detail(intake_id: int, request: Request) -> IntakeResponse:
    intake = get_intake(intake_id, engine=request.app.state.engine)
    if intake is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake not found")
    return IntakeResponse.model_validate(intake, from_attributes=True)
