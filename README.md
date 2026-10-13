# Intake triage

## A · How to run

### Prerequisites

- **Docker Compose** for the simplest setup, or **Python 3.12+** and **Node.js 22+** to run the services directly.
- An Anthropic API key to generate AI triage. The app still saves intakes without one and marks them **Needs review**.

### Install and environment

From this directory, copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` if you want AI triage. `ANTHROPIC_MODEL` is optional; the default is `claude-haiku-4-5-20251001`. Keep `.env` out of Git.

### Run with Docker Compose

```sh
docker compose up --build
```

Open **http://127.0.0.1:5173/**. The API is at **http://127.0.0.1:8000/** and its interactive docs are at **http://127.0.0.1:8000/docs**. Stop with `docker compose down`. SQLite data is kept in the `sqlite_data` volume across restarts; `docker compose down -v` also removes that data.

### Run backend and frontend directly

From this directory, install the backend dependencies and start the API:

```sh
python3 -m pip install -r requirements.txt
python3 -m uvicorn backend.api:app --reload
```

In a second terminal, start the frontend:

```sh
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. The Vite server forwards `/api/*` to port 8000. The API creates the SQLite table on startup and stores records in `backend/data/intakes.db` by default. Set `DATABASE_URL` to use another SQLite database URL; set `VITE_API_PROXY_TARGET` before `npm run dev` if the API is on another address.

## B · What you built

- A React/Vite intake workspace backed by a FastAPI API and persistent SQLite storage.
- A **create → list → detail** flow: enter a title, description, budget range, timeline, and industry; find saved intakes with search; open one to see its details. You can also edit an intake or delete it after confirmation.
- On creation or edit, Claude generates a 2–3 sentence summary, three tags (industry, budget, timeline), and a 1–5 item risk checklist. The API validates and saves those results. If triage fails or no key is configured, the intake remains saved with **Needs review** and no stale AI results.
- Loading, empty, search with no results, form validation, submission progress, and visible API error states are included.

## C · Verification

Run the backend suite from this directory and the frontend tests and build from `frontend/`:

```sh
python3 -m pytest -q
cd frontend
npm test
npm run build
```

Current local results: **35 backend tests passed, 1 live AI test skipped; 6 frontend tests passed; the frontend production build succeeded**. Backend tests cover persistence, API create/list/detail/edit/delete behavior, validation, and AI failure handling. Frontend tests cover empty state and key create, edit, and delete flows with mocked API responses. These normal tests do not call Claude.

To verify live AI generation and persistence with a real key, run this from this directory:

```sh
RUN_LIVE_AI_TESTS=1 python3 -m pytest tests/test_ai_integration.py -q
```

This test makes at least two billable Anthropic API calls and was **not run** for the results above.

The decision log also records manual browser testing and a Codex computer-use walkthrough acting as an end user. Use this sample to repeat the intake flow in the browser:

1. Start the app and open **http://127.0.0.1:5173/**. On a fresh database, confirm the empty state appears. Select **New intake**.
2. Enter **Retail support pilot** as the title, **Build an assistant to help the support team answer order questions** as the description, **$25k–$50k** as the budget range, **3 months** as the timeline, and **Retail** as the industry. Select **Create intake**. The button should show progress while the request runs.
3. Confirm the app returns to the list and opens the saved intake's detail view. Check that all five submitted fields are present. Close the detail, search for **Retail support**, and confirm the record appears; a search for an unrelated term should show the no-results state.
4. Reload the page and open the intake again. Its fields should still be present, showing that SQLite persisted the record. With a valid Anthropic key, confirm a summary, industry/budget/timeline tags, and risk checklist appear. Without a key, confirm the intake is still saved and marked **Needs review**.
5. Select **Edit intake**, change the title to **Retail support launch**, and save. Confirm the updated title appears and the AI triage is regenerated when a key is available. Then select **Delete intake**, confirm the prompt, and check that the record leaves the list.
6. For error states, try submitting with a required field blank. Stop the API and reload the page; the connection error and **Try again** action should appear. Restart the API and use **Try again** to reload the list.
