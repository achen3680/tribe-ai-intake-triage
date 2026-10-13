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
returns HTTP 201 with those fields plus `id`, `created_at`, and the AI fields
described below. Missing, empty,
or invalid fields return HTTP 422 without creating a record.

Run API tests with `python3 -m pytest tests/test_api.py`.

`GET /intakes` returns all saved intakes in ID order (or an empty array).
`GET /intakes/{intake_id}` returns one intake by its integer ID, or HTTP 404
when the ID does not exist. Both GET responses use the same fields as the
successful POST response.

## AI triage on creation

Put `ANTHROPIC_API_KEY` in `.env` in this directory (see `.env.example`), or
export it in the server environment. Startup loads `.env` without overriding an
exported value. `ANTHROPIC_MODEL` is optional and defaults to
`claude-haiku-4-5-20251001`. Restart the server after changing `.env`.

`POST /intakes` first saves the submitted fields, then sends them to Claude using
its JSON-schema structured output mode. When triage succeeds, it persists a 2–3 sentence `summary`, a
`tags` object with exactly `industry`, `budget`, and `timeline`, and a `risks`
array of 1–5 checklist items. The three tag slots use these draft categories:

| Slot | Allowed values | Rule |
| --- | --- | --- |
| Industry | `healthcare`, `financial-services`, `retail`, `manufacturing`, `technology`, `education`, `public-sector`, `other` | Closest match to the stated industry. |
| Budget | `small`, `medium`, `large`, `unknown` | USD range midpoint: under $25k, $25k–$100k, over $100k; unknown if not interpretable. |
| Timeline | `urgent`, `near-term`, `long-term`, `unknown` | Due within 4 weeks, 1–3 months, over 3 months; unknown if not interpretable. |

The server validates AI output before attaching it to the saved intake. If
Claude is unavailable or its output fails validation, `POST /intakes` still
returns HTTP 201 with the saved intake. In that case, `summary`, `tags`, and
`risks` are null and `triage_status` is `unavailable`; successful enrichment has
`triage_status: "complete"`. The list and detail endpoints expose the same
status. Existing rows from before this feature remain readable with null AI
fields; startup adds the three columns to an existing SQLite table. Run all
backend tests with `python3 -m pytest -q`.
