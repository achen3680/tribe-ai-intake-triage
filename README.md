# Intake triage app

## Frontend

From this directory, start the API with `python3 -m uvicorn backend.api:app --reload`.
In another terminal, run `cd frontend`, `npm install`, and `npm run dev`, then open
`http://127.0.0.1:5173/`. The landing page loads all saved intakes automatically
(newest first), with search and a detail drawer. Use **New intake** in the top
right to enter the five required fields. Creating an intake waits for the API's
AI triage to finish, then returns to the list and opens the saved intake. If AI
triage fails, the intake is still saved and shown with a **Needs review** status.
The Vite development server
proxies `/api/*` to the FastAPI server on port 8000, so both servers must be
running. The page shows loading, empty, and connection error states. To proxy
to a different API server during development, set `VITE_API_PROXY_TARGET` before
running `npm run dev`.

Run `npm run build` from `frontend/` to type-check and build the production
assets. A production host must route `/api/*` to the FastAPI server as the
development proxy does.

Run `npm test` from `frontend/` to check the create flow when AI triage is
unavailable. The test uses a mock API response, so it does not create a real
intake or call Claude.

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

To verify the complete Claude path with a real API key, run
`RUN_LIVE_AI_TESTS=1 python3 -m pytest tests/test_ai_integration.py -q`.
The test creates two intakes in a temporary SQLite database, checks that each
Claude response contains a valid summary, all three tags, and a risk checklist,
then checks that list/detail responses and SQLite retain those outputs. It makes
at least two billable API calls; a locally invalid Claude result is retried once.
The normal test suite skips this test unless the flag is
set.
