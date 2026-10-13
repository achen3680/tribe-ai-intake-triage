# Intake triage app

## Database setup

Install the backend dependency with `python3 -m pip install -r requirements.txt`.
Run `python3 -m backend.database` from this directory to create the SQLite
`intakes` table. The default database is `backend/data/intakes.db`. Set
`DATABASE_URL` to use another SQLite database URL.

`backend.models.Intake` is a SQLAlchemy mapped dataclass. Its intake fields are
`title`, `description`, `budget_range`, `timeline`, `industry` (all strings),
and `created_at` (a UTC `datetime` assigned when the object is created). The
database also assigns each record an integer primary key.

Call `backend.intakes.create_intake` with the five string fields to save a new
record. It assigns `created_at` and returns the saved intake with its database
ID. Pass an `engine` to target a different initialized database.

Run the database test with `python3 -m pytest tests/test_database.py`.

## Create intake API

Install dependencies with `python3 -m pip install -r requirements.txt`, then run
`python3 -m uvicorn backend.api:app --reload` from this directory. The API creates
the SQLite table on startup. `POST /intakes` accepts JSON with `title`,
`description`, `budget_range`, `timeline`, and `industry`. Every field must be a
nonempty string; whitespace around values is removed. A successful request
returns HTTP 201 with those fields plus `id` and `created_at`. Missing, empty,
or invalid fields return HTTP 422 without creating a record.

Run API tests with `python3 -m pytest tests/test_api.py`.

`GET /intakes` returns all saved intakes in ID order (or an empty array).
`GET /intakes/{intake_id}` returns one intake by its integer ID, or HTTP 404
when the ID does not exist. Both GET responses use the same fields as the
successful POST response.
